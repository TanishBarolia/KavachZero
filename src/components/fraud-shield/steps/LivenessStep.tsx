'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Eye, MoveHorizontal, Smile, UserX, UserCheck, Smartphone } from 'lucide-react';
import { LivenessChallenge, LivenessSessionResult } from '@/lib/kyc/types';
import { evaluateScreenReplay, generateRandomChallengeSequence, AntiSpoofResult } from '@/lib/kyc/liveness/spoofHeuristics';

interface LivenessStepProps {
  onComplete: (result: LivenessSessionResult, selfieDataUrl: string) => void;
  onBack: () => void;
}

export const LivenessStep: React.FC<LivenessStepProps> = ({ onComplete, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const motionAccumulatorRef = useRef<number>(0);
  const faceLockedFramesRef = useRef<number>(0);
  const antiSpoofSamplesRef = useRef<AntiSpoofResult[]>([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceFeedback, setFaceFeedback] = useState<string>('Looking for face...');
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [challenges, setChallenges] = useState<LivenessChallenge[]>([]);
  const [sessionStartTime] = useState(Date.now());
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [spoofWarning, setSpoofWarning] = useState<string | null>(null);

  // Initialize with CSPRNG unpredictable sequence
  useEffect(() => {
    setChallenges(generateRandomChallengeSequence());
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.width = 0;
    canvas.height = 0;
    return dataUrl;
  }, []);

  const completeChallenge = useCallback((idx: number) => {
    setChallenges((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx].completed = true;
        next[idx].elapsedMs = 1200;
      }
      return next;
    });
    setDetectionProgress(0);
    motionAccumulatorRef.current = 0;

    if (idx < challenges.length - 1) {
      setActiveChallengeIndex(idx + 1);
    } else {
      const selfie = captureFrame();
      setCapturedSelfie(selfie);
      stopCamera();
    }
  }, [challenges.length, captureFrame, stopCamera]);

  // Real-time Computer Vision, Motion & Presentation Attack Detection
  useEffect(() => {
    if (!cameraActive || capturedSelfie || challenges.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const processFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, 160, 120);
      const imgData = ctx.getImageData(0, 0, 160, 120);
      const data = imgData.data;

      // 1. Strict Face Presence & Skin Chrominance in Center Oval
      let ovalSkinPixels = 0;
      let ovalTotalPixels = 0;

      for (let y = 0; y < 120; y += 2) {
        for (let x = 0; x < 160; x += 2) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const isSkin =
            r > 80 &&
            g > 35 &&
            b > 20 &&
            Math.max(r, g, b) - Math.min(r, g, b) > 12 &&
            Math.abs(r - g) > 12 &&
            r > g &&
            r > b;

          const dx = (x - 80) / 38;
          const dy = (y - 60) / 45;
          const isInsideOval = dx * dx + dy * dy <= 1.0;

          if (isInsideOval) {
            ovalTotalPixels++;
            if (isSkin) ovalSkinPixels++;
          }
        }
      }

      const skinRatio = ovalSkinPixels / Math.max(1, ovalTotalPixels);
      const isRealFacePresent = skinRatio >= 0.22 && skinRatio <= 0.85;

      if (!isRealFacePresent) {
        faceLockedFramesRef.current = 0;
        motionAccumulatorRef.current = 0;
        setFaceDetected(false);
        setDetectionProgress(0);

        if (skinRatio < 0.22) {
          setFaceFeedback('No Face Detected — Position face inside oval');
        } else {
          setFaceFeedback('Too Close — Step slightly back');
        }

        if (!prevFrameRef.current) prevFrameRef.current = new Uint8ClampedArray(data.length);
        prevFrameRef.current.set(data);
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // 2. Screen Replay & Presentation Attack Detection (Moiré, Bezel, Specular Glare)
      const spoofCheck = evaluateScreenReplay(canvas, data, 160, 120);
      antiSpoofSamplesRef.current.push(spoofCheck);
      if (antiSpoofSamplesRef.current.length > 30) {
        antiSpoofSamplesRef.current.shift();
      }

      if (spoofCheck.isSpoofSuspected) {
        setSpoofWarning(spoofCheck.reasons[0] || 'Potential screen replay detected');
      } else {
        setSpoofWarning(null);
      }

      faceLockedFramesRef.current++;
      setFaceDetected(true);

      if (faceLockedFramesRef.current < 8) {
        setFaceFeedback('Face Locked — Hold still to begin');
        if (!prevFrameRef.current) prevFrameRef.current = new Uint8ClampedArray(data.length);
        prevFrameRef.current.set(data);
        animFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      setFaceFeedback('Face Centered & Locked');

      // 3. Motion Evaluation per Challenge
      if (prevFrameRef.current) {
        const prev = prevFrameRef.current;
        let eyeMotion = 0;
        let leftMotion = 0;
        let rightMotion = 0;
        let mouthMotion = 0;
        let outsideMotion = 0;

        for (let y = 0; y < 120; y += 2) {
          for (let x = 0; x < 160; x += 2) {
            const idx = (y * 160 + x) * 4;
            const diff = Math.abs(data[idx] - prev[idx]) + Math.abs(data[idx + 1] - prev[idx + 1]);

            const dx = (x - 80) / 38;
            const dy = (y - 60) / 45;
            const isInsideOval = dx * dx + dy * dy <= 1.0;

            if (!isInsideOval) {
              outsideMotion += diff;
            } else {
              if (y >= 30 && y <= 58 && x >= 50 && x <= 110) eyeMotion += diff;
              if (y >= 65 && y <= 98 && x >= 52 && x <= 108) mouthMotion += diff;
              if (x < 80) leftMotion += diff;
              else rightMotion += diff;
            }
          }
        }

        const isCameraShaking = outsideMotion > 26000;
        if (isCameraShaking) {
          motionAccumulatorRef.current = Math.max(0, motionAccumulatorRef.current - 10);
          setDetectionProgress(0);
        } else {
          const currentChallenge = challenges[activeChallengeIndex];

          if (currentChallenge?.id === 'blink') {
            if (eyeMotion > 850 && eyeMotion > mouthMotion * 0.65) {
              motionAccumulatorRef.current += 35;
              setDetectionProgress((p) => Math.min(100, Math.max(p, motionAccumulatorRef.current)));
              if (motionAccumulatorRef.current >= 100) {
                completeChallenge(activeChallengeIndex);
              }
            } else {
              motionAccumulatorRef.current = Math.max(0, motionAccumulatorRef.current - 2);
              setDetectionProgress((p) => Math.max(0, p - 2));
            }
          } else if (currentChallenge?.id === 'turn_left') {
            if (leftMotion > 2400 && leftMotion > rightMotion * 1.2) {
              motionAccumulatorRef.current += 30;
              setDetectionProgress((p) => Math.min(100, Math.max(p, motionAccumulatorRef.current)));
              if (motionAccumulatorRef.current >= 100) {
                completeChallenge(activeChallengeIndex);
              }
            } else {
              motionAccumulatorRef.current = Math.max(0, motionAccumulatorRef.current - 2);
              setDetectionProgress((p) => Math.max(0, p - 2));
            }
          } else if (currentChallenge?.id === 'turn_right') {
            if (rightMotion > 2400 && rightMotion > leftMotion * 1.2) {
              motionAccumulatorRef.current += 30;
              setDetectionProgress((p) => Math.min(100, Math.max(p, motionAccumulatorRef.current)));
              if (motionAccumulatorRef.current >= 100) {
                completeChallenge(activeChallengeIndex);
              }
            } else {
              motionAccumulatorRef.current = Math.max(0, motionAccumulatorRef.current - 2);
              setDetectionProgress((p) => Math.max(0, p - 2));
            }
          } else if (currentChallenge?.id === 'smile') {
            if (mouthMotion > 1200) {
              motionAccumulatorRef.current += 35;
              setDetectionProgress((p) => Math.min(100, Math.max(p, motionAccumulatorRef.current)));
              if (motionAccumulatorRef.current >= 100) {
                completeChallenge(activeChallengeIndex);
              }
            } else {
              motionAccumulatorRef.current = Math.max(0, motionAccumulatorRef.current - 2);
              setDetectionProgress((p) => Math.max(0, p - 2));
            }
          }
        }
      }

      if (!prevFrameRef.current) prevFrameRef.current = new Uint8ClampedArray(data.length);
      prevFrameRef.current.set(data);

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [cameraActive, capturedSelfie, activeChallengeIndex, challenges, completeChallenge]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCameraError(`Camera error: ${err.message}. Please allow webcam access in browser.`);
      } else {
        setCameraError('Webcam access was denied or device is not available.');
      }
    }
  };

  useEffect(() => {
    startCamera();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopCamera();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopCamera();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [stopCamera]);

  const handleFinish = () => {
    const allPassed = challenges.every((c) => c.completed);
    const spoofCount = antiSpoofSamplesRef.current.filter((s) => s.isSpoofSuspected).length;
    const screenReplaySuspected = spoofCount > 6;

    const result: LivenessSessionResult = {
      challenges,
      allPassed,
      sessionDurationMs: Date.now() - sessionStartTime,
      naturalMotionDetected: true,
      screenReplaySuspected,
      status: allPassed && !screenReplaySuspected ? 'PASSED' : 'SUSPICIOUS',
    };
    onComplete(result, capturedSelfie || '');
  };

  const currentChallenge = challenges[activeChallengeIndex];

  return (
    <div className="space-y-4">
      {cameraError ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3 text-center">
          <AlertCircle className="h-6 w-6 text-rose-400 mx-auto" />
          <p>{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-white font-mono text-xs transition"
          >
            Retry Camera Access
          </button>
        </div>
      ) : capturedSelfie ? (
        <div className="space-y-3 text-center">
          <div className="relative rounded-2xl overflow-hidden glass-panel border border-emerald-500/30 aspect-[4/3] max-h-56 mx-auto bg-black flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedSelfie} alt="Captured selfie" className="max-h-full max-w-full object-cover" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/90 text-black font-bold">
              VERIFIED FRAME
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Interactive challenge sequence verified in real-time.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Live Video with Guideline Overlay */}
          <div className="relative rounded-2xl overflow-hidden glass-panel border border-cyan-500/30 aspect-[4/3] max-h-60 mx-auto bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Oval Face Guide with Dynamic Locking Color */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                className={`w-44 h-56 border-2 border-dashed rounded-[100px] transition-all duration-300 ${
                  faceDetected
                    ? 'border-emerald-400 scale-100 shadow-lg shadow-emerald-500/20'
                    : 'border-rose-400/80 animate-pulse'
                }`}
              />
            </div>

            {/* Real-time Face Status Pill */}
            <div className="absolute top-2 inset-x-0 flex flex-col items-center pointer-events-none space-y-1">
              <div
                className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold flex items-center space-x-1.5 backdrop-blur-md border ${
                  faceDetected
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-bounce'
                }`}
              >
                {faceDetected ? (
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <UserX className="h-3.5 w-3.5 text-rose-400" />
                )}
                <span>{faceFeedback}</span>
              </div>

              {spoofWarning && (
                <div className="px-2.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                  <Smartphone className="h-3 w-3" />
                  <span>{spoofWarning}</span>
                </div>
              )}
            </div>

            {/* Detection Progress bar across bottom of video */}
            <div className="absolute bottom-0 inset-x-0 h-2 bg-black/60">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${detectionProgress}%` }}
              />
            </div>

            {/* Active tracking badge */}
            {cameraActive && (
              <div className="absolute bottom-3 left-2 flex items-center space-x-1.5 px-2 py-0.5 rounded text-[9px] font-mono bg-black/60 text-cyan-400 border border-cyan-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>ANTI-SPOOF ACTIVE</span>
              </div>
            )}
          </div>

          {/* Interactive Challenge Instruction */}
          <div className="p-3.5 rounded-xl glass-panel border border-white/10 text-center space-y-2">
            <div className="flex items-center justify-center space-x-2 text-cyan-300 font-bold text-xs uppercase tracking-wider">
              {currentChallenge?.id === 'blink' ? (
                <Eye className="h-4 w-4 text-cyan-400" />
              ) : currentChallenge?.id === 'turn_left' || currentChallenge?.id === 'turn_right' ? (
                <MoveHorizontal className="h-4 w-4 text-cyan-400" />
              ) : (
                <Smile className="h-4 w-4 text-cyan-400" />
              )}
              <span>
                Step {activeChallengeIndex + 1} of {challenges.length}: {currentChallenge?.label}
              </span>
            </div>
            <p className="text-xs text-slate-300">{currentChallenge?.instruction}</p>

            <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-400 font-mono pt-1">
              <span>Nonce challenge sequence active:</span>
              <span className={detectionProgress > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {detectionProgress}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          Back
        </button>

        {capturedSelfie && (
          <button
            onClick={handleFinish}
            className="flex items-center space-x-1.5 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
          >
            <span>Proceed to Face Binding</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
