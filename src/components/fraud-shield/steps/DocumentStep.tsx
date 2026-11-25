'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, AlertCircle, CheckCircle2, RotateCw, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { DocumentValidationResult } from '@/lib/kyc/types';
import { validateDocumentFile } from '@/lib/kyc/validation/fileSniff';
import { runDocumentOcr, ExtendedOcrResult } from '@/lib/kyc/ocr/ocrEngine';

interface DocumentStepProps {
  onDocumentConfirmed: (file: File, validation: DocumentValidationResult, previewUrl: string, initialOcr?: ExtendedOcrResult) => void;
  onBack: () => void;
}

export const DocumentStep: React.FC<DocumentStepProps> = ({ onDocumentConfirmed, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validation, setValidation] = useState<DocumentValidationResult | null>(null);
  const [quickOcr, setQuickOcr] = useState<ExtendedOcrResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setIsValidating(true);
    setValidation(null);
    setQuickOcr(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // 1. Run physical image limits, blur, contrast, format sniffing
      const res = await validateDocumentFile(file);
      setValidation(res);

      // 2. Perform fast preliminary OCR & Aadhaar checksum analysis right on upload
      if (res.isValid) {
        try {
          const ocrRes = await runDocumentOcr(file);
          setQuickOcr(ocrRes);
        } catch {
          // Non-blocking preliminary OCR
        }
      }
    } catch {
      setValidation({
        isValid: false,
        format: 'unknown',
        width: 0,
        height: 0,
        sizeBytes: file.size,
        mimeType: file.type,
        blurScore: 0,
        isBlurry: false,
        contrastScore: 0,
        isLowContrast: false,
        glareScore: 0,
        hasGlare: false,
        error: 'Error decoding file contents.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleProceed = () => {
    if (selectedFile && validation && validation.isValid && previewUrl) {
      onDocumentConfirmed(selectedFile, validation, previewUrl, quickOcr || undefined);
    }
  };

  const aadhaar = quickOcr?.aadhaar;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition glass-panel group"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <UploadCloud className="h-6 w-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-white">Upload Government ID / Aadhaar / Passport</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Drag & drop or browse image (JPEG, PNG, or WebP up to 10MB).
          </p>
          <span className="mt-3 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Magic-Byte Verified &bull; UIDAI Verhoeff Checksum Active
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview Container */}
          <div className="relative rounded-2xl overflow-hidden glass-panel border border-white/10 aspect-[16/10] max-h-60 bg-black/40 flex items-center justify-center">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-full max-w-full object-contain transition-transform duration-300"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            )}

            {/* Quick preview controls */}
            <div className="absolute bottom-2 right-2 flex space-x-1 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1 text-slate-300 hover:text-white"
                title="Rotate 90 degrees"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setValidation(null);
                  setQuickOcr(null);
                }}
                className="px-2 py-0.5 text-[10px] text-rose-300 hover:text-rose-200"
              >
                Change
              </button>
            </div>
          </div>

          {/* Validation Feedback */}
          {isValidating ? (
            <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2 p-3 rounded-xl glass-panel border border-cyan-500/20">
              <div className="h-3 w-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing image framing, clarity, and UIDAI checksums...</span>
            </div>
          ) : validation ? (
            <div className="space-y-2.5">
              {/* Immediate Aadhaar Fake/Authentic Detection Banner */}
              {aadhaar?.isAadhaarCard && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    aadhaar.status === 'SUSPICIOUS_FAKE'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                    {aadhaar.status === 'SUSPICIOUS_FAKE' ? (
                      <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {aadhaar.status === 'SUSPICIOUS_FAKE'
                        ? 'SUSPICIOUS / FAKE AADHAAR DETECTED'
                        : 'AADHAAR FORMAT & CHECKSUM VERIFIED'}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] flex flex-wrap gap-x-4 text-slate-300">
                    <div>UID: <span className="text-white font-bold">{aadhaar.aadhaarNumber || 'Unreadable'}</span></div>
                    <div>
                      Verhoeff Checksum:{' '}
                      <span className={aadhaar.isVerhoeffValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {aadhaar.isVerhoeffValid ? 'PASSED' : 'FAILED (Invalid / Dummy UID)'}
                      </span>
                    </div>
                  </div>

                  {aadhaar.reasons.length > 0 && (
                    <p className="text-[11px] text-rose-200 bg-black/30 p-1.5 rounded">
                      {aadhaar.reasons[0]}
                    </p>
                  )}
                </div>
              )}

              {/* Physical Clarity Card (Explicitly labeled as Pre-Check, NOT "Document Verified") */}
              <div
                className={`p-3 rounded-xl border text-xs space-y-2 ${
                  validation.isValid
                    ? 'bg-slate-900/60 border-white/10 text-slate-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center space-x-2">
                    {validation.isValid ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    )}
                    <span>
                      {validation.isValid
                        ? `Image Quality Pre-Check Passed (${validation.format.toUpperCase()} ${validation.width}×${validation.height})`
                        : 'Image Quality Check Failed'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Ready for Forensics
                  </span>
                </div>

                {validation.error && <p className="text-[11px] text-rose-200">{validation.error}</p>}

                {validation.isValid && (
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-300 pt-1">
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Sharpness:</span>
                      <span className={validation.isBlurry ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {validation.isBlurry ? 'Low (Blurry)' : 'Good'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Contrast:</span>
                      <span className={validation.isLowContrast ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {validation.isLowContrast ? 'Low' : 'Adequate'}
                      </span>
                    </div>
                    <div className="p-1.5 rounded bg-black/30 border border-white/5">
                      <span className="text-slate-400 block">Glare:</span>
                      <span className={validation.hasGlare ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                        {validation.hasGlare ? 'Glare Present' : 'Minimal'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          Back
        </button>

        <button
          disabled={!validation || !validation.isValid || isValidating}
          onClick={handleProceed}
          className="flex items-center space-x-1.5 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <span>Run Document Forensics</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
