'use client';

import React from 'react';
import { ScanResult } from '@/types/security';
import { ShieldCheck, AlertTriangle, ShieldX, Activity, Sparkles, Hash } from 'lucide-react';

interface RiskVerdictCardProps {
  scanResult: ScanResult | null;
  isEvaluating?: boolean;
}

export const RiskVerdictCard: React.FC<RiskVerdictCardProps> = ({
  scanResult,
  isEvaluating,
}) => {
  if (!scanResult) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center min-h-[360px] text-center">
        <div className="h-14 w-14 rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center mb-4">
          <Activity className="h-6 w-6 text-slate-500 animate-pulse" />
        </div>
        <h3 className="text-base font-semibold text-slate-300">
          Awaiting Inspection Telemetry
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
          Select a security module on the left and trigger an automated scan or test simulation to evaluate threat risk.
        </p>
      </div>
    );
  }

  const score = scanResult.riskScore;
  const verdict = scanResult.verdict;

  const colorStyles =
    verdict === 'BLOCK'
      ? {
          text: 'text-rose-400',
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          glow: 'shadow-rose-500/10',
          icon: ShieldX,
          label: 'CRITICAL THREAT DETECTED',
        }
      : verdict === 'REVIEW'
      ? {
          text: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          glow: 'shadow-amber-500/10',
          icon: AlertTriangle,
          label: 'SUSPICIOUS INDICATORS - MANUAL REVIEW',
        }
      : {
          text: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          glow: 'shadow-emerald-500/10',
          icon: ShieldCheck,
          label: 'AUTHENTICATED - PASSED ZERO-KNOWLEDGE CHECKS',
        };

  const VerdictIcon = colorStyles.icon;

  // SVG Gauge calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`glass-panel rounded-2xl p-6 border ${colorStyles.border} shadow-xl ${colorStyles.glow} transition-all duration-500`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
            ACTIVE ASSESSMENT
          </span>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center space-x-1.5 mt-0.5">
            <span>{scanResult.module}</span>
            {isEvaluating && (
              <span className="text-[10px] text-cyan-400 animate-pulse font-mono font-normal">
                [processing...]
              </span>
            )}
          </h2>
        </div>

        <div
          className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-xs font-mono font-bold ${colorStyles.bg} ${colorStyles.border} ${colorStyles.text}`}
        >
          <VerdictIcon className="h-4 w-4" />
          <span>{verdict}</span>
        </div>
      </div>

      {/* Center Gauge & Metric Display */}
      <div className="my-6 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* Radial Meter */}
        <div className="relative flex items-center justify-center">
          <svg className="w-32 h-32 -rotate-90 transform">
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="9"
              fill="transparent"
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className={`${colorStyles.text} transition-all duration-1000 ease-out`}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-3xl font-black font-mono tracking-tight ${colorStyles.text}`}>
              {score}
            </span>
            <span className="text-[9px] font-mono text-slate-400 tracking-wider">
              RISK / 100
            </span>
          </div>
        </div>

        {/* Confidence & Quick Meta */}
        <div className="space-y-3 w-full sm:w-auto">
          <div className="p-3 rounded-xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <span>Detection Confidence</span>
              </span>
              <span className="font-mono text-white font-semibold">
                {scanResult.confidence}%
              </span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${scanResult.confidence}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl glass-panel border border-white/5 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              STATUS CLASSIFICATION
            </span>
            <p className={`text-xs font-medium ${colorStyles.text}`}>
              {colorStyles.label}
            </p>
          </div>
        </div>
      </div>

      {/* Flag Breakdown */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
          <span>Triggered Risk Indicators</span>
          <span className="text-[10px] font-mono text-slate-400">
            {scanResult.flags.length} Flags
          </span>
        </h4>

        {scanResult.flags.length === 0 ? (
          <div className="text-xs text-slate-400 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center font-mono">
            Zero threat flags identified. Baseline parameters passed.
          </div>
        ) : (
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {scanResult.flags.map((flag, idx) => {
              const isHigh = flag.severity === 'HIGH';
              const isMed = flag.severity === 'MEDIUM';
              const badge = isHigh
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : isMed
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-300 border-white/10';

              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg glass-panel border border-white/5 text-xs flex flex-col space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      {flag.label}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${badge}`}
                    >
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {flag.details}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cryptographic Linkage Info */}
      {scanResult.recordHash && (
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center space-x-1">
            <Hash className="h-3 w-3 text-cyan-400" />
            <span>RECORD HASH:</span>
          </span>
          <span className="text-slate-300 hover:text-cyan-300 transition cursor-pointer select-all truncate max-w-[200px]">
            {scanResult.recordHash}
          </span>
        </div>
      )}
    </div>
  );
};
