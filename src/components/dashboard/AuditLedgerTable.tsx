'use client';

import React, { useState } from 'react';
import { AuditLogRow, ScanResult } from '@/types/security';
import { verifyAuditChain } from '@/lib/audit-chain';
import { ShieldCheck, ShieldAlert, Copy, Check, FileDown, Database } from 'lucide-react';

interface AuditLedgerTableProps {
  logs: AuditLogRow[];
  onSelectRow?: (row: AuditLogRow) => void;
  onChainVerified?: (isValid: boolean) => void;
}

export const AuditLedgerTable: React.FC<AuditLedgerTableProps> = ({
  logs,
  onSelectRow,
  onChainVerified,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean;
    message: string;
    verifiedCount: number;
  } | null>(null);

  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyAuditChain(logs);
      setVerificationResult(result);
      if (onChainVerified) {
        onChainVerified(result.isValid);
      }
    } catch {
      setVerificationResult({
        isValid: false,
        message: 'Chain evaluation runtime error',
        verifiedCount: 0,
      });
      if (onChainVerified) onChainVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadRowPDF = async (row: AuditLogRow, e: React.MouseEvent) => {
    e.stopPropagation();
    const { exportForensicsPDF } = await import('@/lib/pdf-exporter');
    const scanSim: ScanResult = {
      id: row.id,
      module: row.module_type,
      riskScore: row.risk_score,
      verdict: row.verdict,
      confidence: row.confidence,
      flags: row.flags,
      metadata: row.telemetry_summary,
      timestamp: row.created_at,
      prevHash: row.prev_hash,
      recordHash: row.record_hash,
    };
    await exportForensicsPDF(scanSim);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
              TAMPER-EVIDENT AUDIT LEDGER
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-slate-400">
              {logs.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Browser-native SHA-256 hash chaining (Zero-Knowledge, non-repudiation ledger)
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleVerifyChain}
          disabled={isVerifying || logs.length === 0}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition shadow-lg shadow-cyan-500/10 text-xs font-semibold disabled:opacity-50 self-start sm:self-auto"
        >
          {verificationResult?.isValid ? (
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          )}
          <span>{isVerifying ? 'Hashing Ledger...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {/* Verification Banner */}
      {verificationResult && (
        <div
          className={`p-3 rounded-xl border flex items-center space-x-3 text-xs font-mono transition-all ${
            verificationResult.isValid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {verificationResult.isValid ? (
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
          )}
          <div>
            <span className="font-bold">
              {verificationResult.isValid
                ? 'CRYPTOGRAPHIC INTEGRITY CONFIRMED: '
                : 'INTEGRITY BREACH DETECTED: '}
            </span>
            <span>{verificationResult.message}</span>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 text-[11px]">
              <th className="py-2.5 px-3 font-medium">TIMESTAMP</th>
              <th className="py-2.5 px-3 font-medium">MODULE</th>
              <th className="py-2.5 px-3 font-medium">VERDICT</th>
              <th className="py-2.5 px-3 font-medium">SCORE</th>
              <th className="py-2.5 px-3 font-medium">PREV HASH</th>
              <th className="py-2.5 px-3 font-medium">RECORD HASH</th>
              <th className="py-2.5 px-3 font-medium text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                  No records stored yet. Run a scan from the module harnesses above.
                </td>
              </tr>
            ) : (
              logs.map((row) => {
                const isBlock = row.verdict === 'BLOCK';
                const isReview = row.verdict === 'REVIEW';
                const verdictClass = isBlock
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : isReview
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectRow && onSelectRow(row)}
                    className="hover:bg-white/[0.02] cursor-pointer transition"
                  >
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {row.module_type}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${verdictClass}`}
                      >
                        {row.verdict}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {row.risk_score}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(row.prev_hash);
                        }}
                        className="inline-flex items-center space-x-1 hover:text-slate-300 transition"
                        title={row.prev_hash}
                      >
                        <span>{row.prev_hash.slice(0, 10)}...</span>
                        {copiedHash === row.prev_hash ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(row.record_hash);
                        }}
                        className="inline-flex items-center space-x-1 hover:text-cyan-400 transition"
                        title={row.record_hash}
                      >
                        <span className="text-cyan-400/90">
                          {row.record_hash.slice(0, 10)}...
                        </span>
                        {copiedHash === row.record_hash ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 opacity-40 hover:opacity-100" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => handleDownloadRowPDF(row, e)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition text-[11px]"
                        title="Re-export Forensics PDF"
                      >
                        <FileDown className="h-3.5 w-3.5 text-cyan-400" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
