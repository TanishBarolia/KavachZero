'use client';

import React from 'react';
import { Shield, Lock, EyeOff, ArrowRight } from 'lucide-react';

interface ConsentStepProps {
  onAccept: () => void;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({ onAccept }) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl glass-panel border border-emerald-500/20 bg-emerald-950/10 space-y-3">
        <div className="flex items-center space-x-2 text-emerald-400">
          <Shield className="h-5 w-5" />
          <h4 className="text-sm font-bold tracking-wide">Privacy-First On-Device Verification</h4>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          This system verifies identity credentials using local computer vision and machine learning models executed directly in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl glass-panel border border-white/5 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
            <Lock className="h-4 w-4" />
            <span>Memory-Bounded Guarantee</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Your document image, webcam frames, and facial features remain strictly inside browser memory and are permanently discarded when the session ends.
          </p>
        </div>

        <div className="p-3 rounded-xl glass-panel border border-white/5 space-y-1.5">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
            <EyeOff className="h-4 w-4" />
            <span>Zero-Knowledge Telemetry</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            No PII (name, document number, address, or face embeddings) is ever saved to the database. Only anonymous risk scores and SHA-256 ledger hashes are recorded.
          </p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] text-slate-400 space-y-1">
        <span className="font-semibold text-slate-300">Mandatory Limitation Notice:</span>
        <p>
          This automated screening module is a heuristic aid, not absolute proof of identity. Forensic indicators may produce false positives on compressed scans.
        </p>
      </div>

      <button
        onClick={onAccept}
        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20"
      >
        <span>I Consent &bull; Start Verification</span>
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
};
