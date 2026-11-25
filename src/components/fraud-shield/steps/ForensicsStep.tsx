'use client';

import React, { useState, useEffect } from 'react';
import { ElaFinding, ExifReport, OcrResult } from '@/lib/kyc/types';
import { performElaAnalysis } from '@/lib/kyc/forensics/ela';
import { analyzeExif } from '@/lib/kyc/forensics/exif';
import { runDocumentOcr, ExtendedOcrResult } from '@/lib/kyc/ocr/ocrEngine';
import { Scan, AlertTriangle, ShieldCheck, FileSearch, ArrowRight, Layers, ShieldAlert } from 'lucide-react';

interface ForensicsStepProps {
  documentFile: File;
  onComplete: (ela: ElaFinding, exif: ExifReport, ocr: OcrResult) => void;
  onBack: () => void;
}

export const ForensicsStep: React.FC<ForensicsStepProps> = ({
  documentFile,
  onComplete,
  onBack,
}) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [elaFinding, setElaFinding] = useState<ElaFinding | null>(null);
  const [elaDataUrl, setElaDataUrl] = useState<string | null>(null);
  const [exifReport, setExifReport] = useState<ExifReport | null>(null);
  const [ocrResult, setOcrResult] = useState<ExtendedOcrResult | null>(null);
  const [showElaView, setShowElaView] = useState(false);
  const [opacity, setOpacity] = useState(0.85);

  useEffect(() => {
    let isCancelled = false;

    async function runAnalyses() {
      setAnalyzing(true);
      try {
        const [elaRes, exifRes, ocrRes] = await Promise.all([
          performElaAnalysis(documentFile),
          analyzeExif(documentFile),
          runDocumentOcr(documentFile),
        ]);

        if (!isCancelled) {
          setElaFinding(elaRes.finding);
          setElaDataUrl(elaRes.elaDataUrl);
          setExifReport(exifRes);
          setOcrResult(ocrRes);
        }
      } catch (err) {
        console.error('Forensics error:', err);
      } finally {
        if (!isCancelled) {
          setAnalyzing(false);
        }
      }
    }

    runAnalyses();

    return () => {
      isCancelled = true;
    };
  }, [documentFile]);

  const handleContinue = () => {
    if (elaFinding && exifReport && ocrResult) {
      onComplete(elaFinding, exifReport, ocrResult);
    }
  };

  const aadhaar = ocrResult?.aadhaar;

  return (
    <div className="space-y-4">
      {analyzing ? (
        <div className="p-8 rounded-2xl glass-panel border border-cyan-500/20 text-center space-y-3">
          <div className="h-10 w-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <h4 className="text-sm font-semibold text-white">Running On-Device Forensic Inspections</h4>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
            Verifying Verhoeff checksums, canvas ELA compression variances, and EXIF headers...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Aadhaar Check Banner (if Aadhaar card detected) */}
          {aadhaar?.isAadhaarCard && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                aadhaar.status === 'SUSPICIOUS_FAKE'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold uppercase tracking-wider">
                {aadhaar.status === 'SUSPICIOUS_FAKE' ? (
                  <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                )}
                <span>
                  {aadhaar.status === 'SUSPICIOUS_FAKE'
                    ? 'SUSPICIOUS / FAKE AADHAAR CARD DETECTED'
                    : 'AADHAAR FORMAT & CHECKSUM VERIFIED'}
                </span>
              </div>

              <div className="font-mono text-[11px] space-y-1">
                <div>
                  <span className="text-slate-400">Extracted Number: </span>
                  <span className="text-white font-bold">{aadhaar.aadhaarNumber || 'Unreadable'}</span>
                </div>
                <div>
                  <span className="text-slate-400">UIDAI Verhoeff Checksum: </span>
                  <span
                    className={
                      aadhaar.isVerhoeffValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                    }
                  >
                    {aadhaar.isVerhoeffValid ? 'PASSED (Valid Mathematical Checksum)' : 'FAILED (Invalid Number)'}
                  </span>
                </div>
              </div>

              {aadhaar.reasons.length > 0 && (
                <div className="text-[11px] bg-black/30 p-2 rounded text-rose-200">
                  {aadhaar.reasons[0]}
                </div>
              )}
            </div>
          )}

          {/* ELA Visualizer Card */}
          <div className="p-4 rounded-xl glass-panel border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scan className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Error Level Analysis (ELA)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowElaView(!showElaView)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10 flex items-center space-x-1"
              >
                <Layers className="h-3 w-3" />
                <span>{showElaView ? 'Hide Heatmap' : 'View ELA Heatmap'}</span>
              </button>
            </div>

            {showElaView && elaDataUrl && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/50 aspect-[16/10] max-h-52 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={elaDataUrl}
                    alt="ELA Heatmap"
                    className="max-h-full max-w-full object-contain"
                    style={{ opacity }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Heatmap Opacity</span>
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-32 accent-cyan-400"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Compression Anomaly Score:</span>
              <span
                className={`font-mono font-bold ${
                  elaFinding?.isManipulated ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {elaFinding?.anomalyScore} / 1.00
              </span>
            </div>
            <p className="text-[10px] text-slate-500 italic">{elaFinding?.caveat}</p>
          </div>

          {/* EXIF Metadata Card */}
          <div className="p-4 rounded-xl glass-panel border border-white/10 space-y-2">
            <div className="flex items-center space-x-2">
              <FileSearch className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                EXIF & Hardware Metadata
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2 rounded bg-black/20 border border-white/5">
                <span className="text-slate-500 block text-[10px]">ORIGIN:</span>
                <span className="text-slate-200">
                  {exifReport?.present ? exifReport.make || 'Embedded Camera' : 'Scrubbed / Web Source'}
                </span>
              </div>
              <div className="p-2 rounded bg-black/20 border border-white/5">
                <span className="text-slate-500 block text-[10px]">SOFTWARE TAGS:</span>
                <span className={exifReport?.isEditedSoftware ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {exifReport?.software ? String(exifReport.software).slice(0, 20) : 'None (Camera Native)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
        >
          Back
        </button>

        <button
          disabled={analyzing}
          onClick={handleContinue}
          className="flex items-center space-x-1.5 py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          <span>Proceed to Active Liveness</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
