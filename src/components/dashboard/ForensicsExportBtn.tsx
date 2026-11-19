'use client';

import React, { useState } from 'react';
import { ScanResult } from '@/types/security';
import { FileText, Download, Check, AlertCircle } from 'lucide-react';

interface ForensicsExportBtnProps {
  scanResult: ScanResult | null;
}

export const ForensicsExportBtn: React.FC<ForensicsExportBtnProps> = ({
  scanResult,
}) => {
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!scanResult) {
    return null;
  }

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      setStatusMessage(null);
      const { exportForensicsPDF } = await import('@/lib/pdf-exporter');
      await exportForensicsPDF(scanResult);
      setStatusMessage('PDF forensics report downloaded successfully');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('PDF export failed:', err);
      setStatusMessage('Failed to generate PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportJSON = async () => {
    try {
      setIsExportingJSON(true);
      setStatusMessage(null);
      const { exportForensicsJSON } = await import('@/lib/pdf-exporter');
      exportForensicsJSON(scanResult);
      setStatusMessage('JSON compliance export downloaded successfully');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('JSON export failed:', err);
      setStatusMessage('Failed to generate JSON');
    } finally {
      setIsExportingJSON(false);
    }
  };

  return (
    <div className="space-y-2 mt-4">
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleExportPDF}
          disabled={isExportingPDF}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition shadow-lg shadow-cyan-500/10 text-xs font-semibold disabled:opacity-50"
        >
          <FileText className="h-4 w-4" />
          <span>{isExportingPDF ? 'Generating PDF...' : 'Download PDF Report'}</span>
        </button>

        <button
          onClick={handleExportJSON}
          disabled={isExportingJSON}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl glass-panel hover:border-white/20 text-slate-300 border border-white/10 transition text-xs font-semibold disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{isExportingJSON ? 'Exporting...' : 'Export JSON'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="text-[11px] font-mono text-center flex items-center justify-center space-x-1.5 text-cyan-400 bg-cyan-950/40 p-1.5 rounded-lg border border-cyan-500/20">
          {statusMessage.includes('Failed') ? (
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
