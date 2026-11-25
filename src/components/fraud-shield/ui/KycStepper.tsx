'use client';

import React from 'react';
import { StepId } from '@/lib/kyc/types';
import { Check, ShieldCheck, FileText, Scan, Camera, UserCheck, Send } from 'lucide-react';

interface KycStepperProps {
  currentStep: StepId;
  completedSteps: StepId[];
}

const STEPS: { id: StepId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'consent', label: 'Consent', icon: ShieldCheck },
  { id: 'document', label: 'ID Upload', icon: FileText },
  { id: 'forensics', label: 'Forensics', icon: Scan },
  { id: 'liveness', label: 'Liveness', icon: Camera },
  { id: 'facematch', label: 'Face Match', icon: UserCheck },
  { id: 'review', label: 'Review', icon: Send },
];

export const KycStepper: React.FC<KycStepperProps> = ({ currentStep, completedSteps }) => {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="w-full pb-4 border-b border-white/10">
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isDone = completedSteps.includes(step.id) || idx < currentIndex;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center space-y-1">
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 scale-105'
                      : isDone
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 text-slate-500 border border-white/5'
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-mono tracking-tight hidden sm:inline ${
                    isCurrent ? 'text-emerald-300 font-bold' : isDone ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-1 transition-all ${
                    idx < currentIndex ? 'bg-emerald-500/40' : 'bg-white/10'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
