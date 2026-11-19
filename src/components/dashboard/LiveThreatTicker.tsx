'use client';

import React from 'react';
import { AuditLogRow } from '@/types/security';
import { Radio, AlertTriangle, ShieldCheck, Ban } from 'lucide-react';

interface LiveThreatTickerProps {
  logs: AuditLogRow[];
}

export const LiveThreatTicker: React.FC<LiveThreatTickerProps> = ({ logs }) => {
  const displayLogs = logs.slice(0, 10);

  return (
    <div className="w-full bg-[#060913]/90 border-b border-white/5 px-4 py-2 flex items-center overflow-hidden">
      {/* Indicator */}
      <div className="flex items-center space-x-1.5 pr-4 border-r border-white/10 shrink-0">
        <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
        <span className="text-[11px] font-mono tracking-wider font-semibold text-cyan-400 uppercase">
          LIVE FEED
        </span>
      </div>

      {/* Stream Items */}
      <div className="flex items-center space-x-6 pl-4 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-xs font-mono">
        {displayLogs.length === 0 ? (
          <span className="text-slate-500 italic">
            Waiting for real-time telemetry events from modules...
          </span>
        ) : (
          displayLogs.map((item) => {
            const isBlock = item.verdict === 'BLOCK';
            const isReview = item.verdict === 'REVIEW';
            const badgeClass = isBlock
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
              : isReview
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

            const Icon = isBlock ? Ban : isReview ? AlertTriangle : ShieldCheck;

            return (
              <div
                key={item.id}
                className="flex items-center space-x-2 py-0.5 px-2 rounded glass-panel border border-white/5 shrink-0 hover:border-white/20 transition"
              >
                <span className="text-slate-400 text-[10px]">
                  {new Date(item.created_at).toLocaleTimeString()}
                </span>
                <span className="text-slate-300 font-semibold">
                  [{item.module_type}]
                </span>
                <div
                  className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded border text-[10px] font-bold ${badgeClass}`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  <span>{item.verdict}</span>
                  <span>({item.risk_score})</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  #{item.record_hash.slice(0, 8)}...
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
