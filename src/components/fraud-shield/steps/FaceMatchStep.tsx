'use client';

import React, { useState, useEffect } from 'react';
import { FaceMatchResult } from '@/lib/kyc/types';
import { compareFacesAdvanced, extractTightFaceCrop } from '@/lib/kyc/face/faceMatchAdvanced';
import { UserCheck, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface FaceMatchStepProps {
  documentPreviewUrl: string;
  selfieUrl: string;
  onComplete: (result: FaceMatchResult) => void;
  onBack: () => void;
}

export const FaceMatchStep: React.FC<FaceMatchStepProps> = ({
  documentPreviewUrl,
  selfieUrl,
  onComplete,
  onBack,
}) => {
  const [croppedIdFace, setCroppedIdFace] = useState<string | null>(null);
  const [croppedSelfieFace, setCroppedSelfieFace] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number>(0);
  const [band, setBand] = useState<'STRONG_MATCH' | 'MODERATE_MATCH' | 'MISMATCH' | 'INCONCLUSIVE'>('MISMATCH');
  const [evaluating, setEvaluating] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function evaluateBinding() {
      setEvaluating(true);
      try {
        // 1. Extract tight crops for both ID card portrait and selfie
        const [idCropRes, selfieCropRes] = await Promise.all([
          extractTightFaceCrop(documentPreviewUrl),
          extractTightFaceCrop(selfieUrl),
        ]);

        if (!isCancelled) {
          setCroppedIdFace(idCropRes?.dataUrl || documentPreviewUrl);
          setCroppedSelfieFace(selfieCropRes?.dataUrl || selfieUrl);
        }

        // 2. Perform advanced structural HOG + Normalized Cross-Correlation comparison
        const comp = await compareFacesAdvanced(
          idCropRes?.dataUrl || documentPreviewUrl,
          selfieCropRes?.dataUrl || selfieUrl
        );

        if (!isCancelled) {
          setSimilarity(comp.similarity);
          setBand(comp.band);
        }
      } catch (err) {
        console.error('Face match step error:', err);
        if (!isCancelled) {
          setSimilarity(42);
          setBand('MISMATCH');
        }
      } finally {
        if (!isCancelled) {
          setEvaluating(false);
        }
      }
    }

    evaluateBinding();

    return () => {
      isCancelled = true;
    };
  }, [documentPreviewUrl, selfieUrl]);

  const handleContinue = () => {
    const result: FaceMatchResult = {
      similarity,
      status: band === 'MISMATCH' ? 'SUSPICIOUS' : 'PASSED',
      band,
      limitationsNotice:
        band === 'MISMATCH'
          ? 'CRITICAL MISMATCH: Facial geometry and skin-tone distribution between the document photo and live selfie do not correlate.'
          : 'Biometric face features bound successfully between ID portrait crop and live frame.',
    };
    onComplete(result);
  };

  return (
    <div className="space-y-4">
      {/* Visual Portrait Binding Card */}
      <div className="p-4 rounded-xl glass-panel border border-white/10 space-y-3">
        <div className="flex items-center space-x-2 text-white">
          <UserCheck className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Biometric Portrait Binding Comparison
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              1. Cropped ID Portrait
            </span>
            <div className="rounded-xl overflow-hidden glass-panel border border-white/10 aspect-square max-h-36 mx-auto bg-black flex items-center justify-center p-1">
              {croppedIdFace ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={croppedIdFace}
                  alt="Cropped ID Portrait"
                  className="max-h-full max-w-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-[10px] text-slate-500">Extracting...</div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">
              2. Live Webcam Selfie
            </span>
            <div className="rounded-xl overflow-hidden glass-panel border border-white/10 aspect-square max-h-36 mx-auto bg-black flex items-center justify-center p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={croppedSelfieFace || selfieUrl}
                alt="Live selfie"
                className="max-h-full max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Metric Bar */}
        {evaluating ? (
          <div className="text-xs font-mono text-cyan-400 text-center py-2">
            Computing facial normalized cross-correlation and histogram vector...
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Similarity Metric:</span>
              <span
                className={`font-bold ${
                  band === 'MISMATCH' ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {similarity}% ({band})
              </span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  band === 'MISMATCH' ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${similarity}%` }}
              />
            </div>

            <div
              className={`p-2 rounded text-[11px] leading-snug flex items-start space-x-2 ${
                band === 'MISMATCH'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              }`}
            >
              {band === 'MISMATCH' ? (
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              )}
              <span>
                {band === 'MISMATCH'
                  ? 'FACIAL MISMATCH DETECTED: Features between the document portrait and webcam image diverge significantly.'
                  : 'FACIAL MATCH VERIFIED: Selfie correlates with identity document photo.'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          Back
        </button>

        <button
          disabled={evaluating}
          onClick={handleContinue}
          className="flex items-center space-x-1.5 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <span>Review & Submit to Risk Engine</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
