'use client';

import React from 'react';
import { KycSessionState } from '@/lib/kyc/types';
import { calculateSubScores, deriveScanFlags } from '@/lib/kyc/scoring/subScores';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface ReviewStepProps {
  state: KycSessionState;
  onSubmit: () => void;
  onReset: () => void;
  isProcessing?: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  state,
  onSubmit,
  onReset,
  isProcessing,
}) => {
  const subScores = calculateSubScores(state);
  const flags = deriveScanFlags(state);

  return (
    <div className="space-y-4">
      {/* Telemetry Summary Card */}
      <div className="p-4 rounded-xl glass-panel border border-white/10 space-y-3">
        <div className="flex items-center space-x-2 text-white">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            Verification Telemetry Summary
          </h4>
        </div>

        <p className="text-xs text-slate-400">
          Inspection completed entirely on-device. Risk sub-scores (0-100, higher = riskier) computed for transmission:
        </p>

        {/* Sub-scores 3-box Grid */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">Liveness & Face</span>
            <span className="text-lg font-bold text-emerald-400">{subScores.liveness}</span>
            <span className="text-[9px] text-slate-500 block">/ 100 Risk</span>
          </div>

          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">ELA & EXIF</span>
            <span className="text-lg font-bold text-emerald-400">{subScores.elaExif}</span>
            <span className="text-[9px] text-slate-500 block">/ 100 Risk</span>
          </div>

          <div className="p-2 rounded-lg bg-black/30 border border-white/5 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block">OCR & Checksum</span>
            <span className="text-lg font-bold text-emerald-400">{subScores.ocr}</span>
            <span className="text-[9px] text-slate-500 block">/ 100 Risk</span>
          </div>
        </div>

        {/* Flags Triggered */}
        <div className="pt-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
            Generated Risk Indicators ({flags.length}):
          </span>
          {flags.length === 0 ? (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-mono text-center">
              Zero threat indicators triggered. Baseline parameters satisfied.
            </div>
          ) : (
            <div className="space-y-1">
              {flags.map((f, i) => (
                <div key={i} className="p-2 rounded bg-white/5 border border-white/10 text-xs flex justify-between">
                  <span className="text-slate-300 font-semibold">{f.label}</span>
                  <span className="text-[10px] font-mono text-rose-400 font-bold">{f.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {state.submissionComplete ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-bold text-emerald-300">Submitted for Unified Risk Evaluation</h4>
          <p className="text-xs text-slate-300 max-w-sm mx-auto">
            Telemetry has been cryptographically hashed and evaluated in the central command card.
          </p>
          <button
            onClick={onReset}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-mono transition border border-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Start New Verification</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
          >
            Start Over
          </button>

          <button
            disabled={isProcessing}
            onClick={onSubmit}
            className="flex items-center space-x-2 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Zap className="h-4 w-4 animate-spin" />
                <span>Evaluating Risk Engine...</span>
              </>
            ) : (
              <>
                <span>Submit to Central Risk Engine</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
