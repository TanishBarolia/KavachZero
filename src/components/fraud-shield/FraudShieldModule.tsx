'use client';

import React, { useState } from 'react';
import { ModuleProps } from '@/types/security';
import {
  StepId,
  KycSessionState,
  DocumentValidationResult,
  ElaFinding,
  ExifReport,
  OcrResult,
  LivenessSessionResult,
  FaceMatchResult,
} from '@/lib/kyc/types';
import { buildScanInput } from '@/lib/kyc/scoring/subScores';
import { KycStepper } from './ui/KycStepper';
import { ConsentStep } from './steps/ConsentStep';
import { DocumentStep } from './steps/DocumentStep';
import { ForensicsStep } from './steps/ForensicsStep';
import { LivenessStep } from './steps/LivenessStep';
import { FaceMatchStep } from './steps/FaceMatchStep';
import { ReviewStep } from './steps/ReviewStep';
import { Shield, Sparkles } from 'lucide-react';

const INITIAL_STATE: KycSessionState = {
  currentStep: 'consent',
  documentFile: null,
  documentPreviewUrl: null,
  documentValidation: null,
  exif: null,
  ela: null,
  ocr: null,
  idFaceCropUrl: null,
  selfieCropUrl: null,
  liveness: null,
  faceMatch: null,
  subScores: {
    liveness: 0,
    elaExif: 0,
    ocr: 0,
  },
  flags: [],
  confidence: 96,
  isAnalyzingDoc: false,
  isSubmitting: false,
  submissionComplete: false,
  errorMessage: null,
};

export const FraudShieldModule: React.FC<ModuleProps> = ({
  onScanComplete,
  isProcessing,
}) => {
  const [state, setState] = useState<KycSessionState>(INITIAL_STATE);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  const handleStepDone = (step: StepId, next: StepId) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
    setState((prev) => ({ ...prev, currentStep: next }));
  };

  const handleDocumentConfirmed = (
    file: File,
    validation: DocumentValidationResult,
    previewUrl: string,
    initialOcr?: any
  ) => {
    setState((prev) => ({
      ...prev,
      documentFile: file,
      documentValidation: validation,
      documentPreviewUrl: previewUrl,
      ocr: initialOcr || prev.ocr,
    }));
    handleStepDone('document', 'forensics');
  };

  const handleForensicsComplete = (
    ela: ElaFinding,
    exif: ExifReport,
    ocr: OcrResult
  ) => {
    setState((prev) => ({
      ...prev,
      ela,
      exif,
      ocr,
    }));
    handleStepDone('forensics', 'liveness');
  };

  const handleLivenessComplete = (
    liveness: LivenessSessionResult,
    selfieDataUrl: string
  ) => {
    setState((prev) => ({
      ...prev,
      liveness,
      selfieCropUrl: selfieDataUrl,
    }));
    handleStepDone('liveness', 'facematch');
  };

  const handleFaceMatchComplete = (faceMatch: FaceMatchResult) => {
    setState((prev) => ({
      ...prev,
      faceMatch,
    }));
    handleStepDone('facematch', 'review');
  };

  const handleSubmit = async () => {
    setState((prev) => ({ ...prev, isSubmitting: true }));
    try {
      const payload = buildScanInput(state);
      await onScanComplete(payload);
      setState((prev) => ({ ...prev, submissionComplete: true }));
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleReset = () => {
    if (state.documentPreviewUrl) {
      URL.revokeObjectURL(state.documentPreviewUrl);
    }
    setState(INITIAL_STATE);
    setCompletedSteps([]);
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
              FINTECH FRAUD SHIELD // ON-DEVICE KYC
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Privacy-First Biometric & Forensic Inspection Wizard
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Client-Bounded (Zero-Knowledge)
        </span>
      </div>

      {/* Stepper Header */}
      <KycStepper currentStep={state.currentStep} completedSteps={completedSteps} />

      {/* Step Views */}
      {state.currentStep === 'consent' && (
        <ConsentStep onAccept={() => handleStepDone('consent', 'document')} />
      )}

      {state.currentStep === 'document' && (
        <DocumentStep
          onDocumentConfirmed={handleDocumentConfirmed}
          onBack={() => setState((prev) => ({ ...prev, currentStep: 'consent' }))}
        />
      )}

      {state.currentStep === 'forensics' && state.documentFile && (
        <ForensicsStep
          documentFile={state.documentFile}
          onComplete={handleForensicsComplete}
          onBack={() => setState((prev) => ({ ...prev, currentStep: 'document' }))}
        />
      )}

      {state.currentStep === 'liveness' && (
        <LivenessStep
          onComplete={handleLivenessComplete}
          onBack={() => setState((prev) => ({ ...prev, currentStep: 'forensics' }))}
        />
      )}

      {state.currentStep === 'facematch' && (
        <FaceMatchStep
          documentPreviewUrl={state.documentPreviewUrl || ''}
          selfieUrl={state.selfieCropUrl || ''}
          onComplete={handleFaceMatchComplete}
          onBack={() => setState((prev) => ({ ...prev, currentStep: 'liveness' }))}
        />
      )}

      {state.currentStep === 'review' && (
        <ReviewStep
          state={state}
          onSubmit={handleSubmit}
          onReset={handleReset}
          isProcessing={isProcessing || state.isSubmitting}
        />
      )}
    </div>
  );
};
