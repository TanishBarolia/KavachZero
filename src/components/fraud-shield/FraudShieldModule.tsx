'use client';

import React, { useState } from 'react';
import { ModuleProps, ModuleScanInput } from '@/types/security';
import { Shield, Sparkles, UserCheck, AlertOctagon, ScanEye, Zap } from 'lucide-react';

export const FraudShieldModule: React.FC<ModuleProps> = ({
  onScanComplete,
  isProcessing,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const runSimulation = async (preset: 'clean' | 'deepfake' | 'tampered_id') => {
    setSelectedPreset(preset);

    let input: ModuleScanInput;

    if (preset === 'clean') {
      input = {
        module: 'FINTECH_KYC',
        rawSubScores: {
          liveness: 10,
          elaExif: 12,
          ocr: 5,
        },
        flags: [],
        metadata: {
          faceMatchConfidence: 98.4,
          elaAnomalyScore: 0.04,
          exifIntegrity: 'VERIFIED_APPLE_IPHONE_15',
          ocrSanityStatus: 'PASSED_GOV_ID',
          captureLatencyMs: 342,
        },
        confidence: 99,
      };
    } else if (preset === 'deepfake') {
      input = {
        module: 'FINTECH_KYC',
        rawSubScores: {
          liveness: 92,
          elaExif: 78,
          ocr: 30,
        },
        flags: [
          {
            code: 'LIVENESS_SYNTHETIC_TEXTURE',
            label: 'Diffusion Artifacts & GAN Glare',
            severity: 'HIGH',
            details: 'Frequency analysis detected pixel grid repetition and lack of natural micro-saccades.',
          },
          {
            code: 'ELA_BOUNDARY_SPLICING',
            label: 'Error Level Inconsistency',
            severity: 'HIGH',
            details: 'Portrait boundary compression rates diverge by 34% compared to background noise floor.',
          },
        ],
        metadata: {
          faceMatchConfidence: 41.2,
          elaAnomalyScore: 0.88,
          exifIntegrity: 'STRIPPED_OR_SYNTHETIC_CANVAS',
          ocrSanityStatus: 'MISMATCH_FONT_KERNING',
          captureLatencyMs: 512,
        },
        confidence: 96,
      };
    } else {
      // tampered_id
      input = {
        module: 'FINTECH_KYC',
        rawSubScores: {
          liveness: 25,
          elaExif: 65,
          ocr: 70,
        },
        flags: [
          {
            code: 'OCR_FONT_KERNING_ANOMALY',
            label: 'DOB Text Modification Detected',
            severity: 'MEDIUM',
            details: 'Date of Birth digit bounding box exhibits non-standard font anti-aliasing.',
          },
          {
            code: 'EXIF_EDIT_SOFTWARE',
            label: 'Photoshop Signature in Metadata',
            severity: 'MEDIUM',
            details: 'EXIF software tags indicate recent edit via external raster manipulation software.',
          },
        ],
        metadata: {
          faceMatchConfidence: 85.0,
          elaAnomalyScore: 0.62,
          exifIntegrity: 'MODIFIED_TIMESTAMP_DISCREPANCY',
          ocrSanityStatus: 'INCONSISTENT_CHECKSUM',
          captureLatencyMs: 410,
        },
        confidence: 91,
      };
    }

    await onScanComplete(input);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
      {/* Module Title Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              FINTECH FRAUD SHIELD MODULE
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Member 2 Component Integration Slot // Accepts `onScanComplete`
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Client-Bounded (Zero-Knowledge)
        </span>
      </div>

      {/* Integration Notice / Team Harness */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-slate-400 leading-relaxed">
        <p className="flex items-center space-x-1.5 text-slate-300 font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Teammate Integration Contract</span>
        </p>
        Member 2 implements the interactive webcam liveness and client-side ELA/OCR canvas analyzer here. Use the test harnesses below to feed real-time telemetry into Harshil&apos;s Risk Engine.
      </div>

      {/* Simulation Harness Controls */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block">
          ONE-CLICK SIMULATION HARNESSES:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => runSimulation('clean')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'clean'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'glass-panel hover:border-emerald-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold">1. Verified KYC</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Clean biometric selfie + untampered ID card (Yields GO)
            </p>
          </button>

          <button
            onClick={() => runSimulation('tampered_id')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'tampered_id'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'glass-panel hover:border-amber-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <ScanEye className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold">2. Modified ID</span>
            </div>
            <p className="text-[10px] text-slate-400">
              DOB font splice + Photoshop signature (Yields REVIEW)
            </p>
          </button>

          <button
            onClick={() => runSimulation('deepfake')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'deepfake'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'glass-panel hover:border-rose-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <AlertOctagon className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-bold">3. Deepfake Face</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Synthetic GAN diffusion artifacts detected (Yields BLOCK)
            </p>
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-xs font-mono text-emerald-400 pt-2">
          <Zap className="h-3.5 w-3.5 animate-spin" />
          <span>Hashing telemetry & appending to audit chain...</span>
        </div>
      )}
    </div>
  );
};
