'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ShieldAlert, Cpu, UserCheck, KeyRound, LogOut } from 'lucide-react';

interface NavbarProps {
  isConfigured: boolean;
  chainValid: boolean | null;
  operator: string;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConfigured,
  chainValid,
  operator,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#060913]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Status */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-[#060913] rounded-[11px] flex items-center justify-center">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-wider text-white">
                KAVACH<span className="text-cyan-400">ZERO</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                v1.0-SOC
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-tight">
              Unified Security Command Center // $0 Zero-Knowledge
            </p>
          </div>
        </div>

        {/* System & Chain Status Indicators */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Supabase Connection Status */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono glass-panel border border-white/5">
            <span
              className={`h-2 w-2 rounded-full ${
                isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300">
              {isConfigured ? 'SUPABASE: LIVE' : 'STORAGE: LOCAL MEMORY'}
            </span>
          </div>

          {/* Cryptographic Ledger Health */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono glass-panel border border-white/5">
            {chainValid === true ? (
              <>
                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">CHAIN: INTACT</span>
              </>
            ) : chainValid === false ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400 animate-bounce" />
                <span className="text-rose-400 font-semibold">CHAIN: CORRUPTED</span>
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-400">CHAIN: UNVERIFIED</span>
              </>
            )}
          </div>
        </div>

        {/* Operator Badge & Auth */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg glass-panel border border-white/10 text-xs">
            <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono text-slate-300 truncate max-w-[140px]">
              {operator}
            </span>
          </div>

          {operator.includes('Demo') ? (
            <Link
              href="/login"
              className="inline-flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition"
            >
              <KeyRound className="h-3 w-3" />
              <span>Operator Login</span>
            </Link>
          ) : (
            <button
              onClick={onSignOut}
              className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 border border-rose-500/20 transition"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
