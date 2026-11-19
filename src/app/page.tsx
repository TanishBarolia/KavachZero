'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/dashboard/Navbar';
import { LiveThreatTicker } from '@/components/dashboard/LiveThreatTicker';
import { RiskVerdictCard } from '@/components/dashboard/RiskVerdictCard';
import { ForensicsExportBtn } from '@/components/dashboard/ForensicsExportBtn';
import { AuditLedgerTable } from '@/components/dashboard/AuditLedgerTable';
import { FraudShieldModule } from '@/components/fraud-shield/FraudShieldModule';
import { PhishingModule } from '@/components/phishing-scanner/PhishingModule';
import { evaluateRisk } from '@/lib/risk-engine';
import { appendAuditLog } from '@/lib/audit-chain';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { AuditLogRow, ModuleScanInput, ScanResult } from '@/types/security';
import { Shield, Mail, AlertTriangle, Layers, Lock, Cpu } from 'lucide-react';

export default function CommandCenterDashboard() {
  const [activeTab, setActiveTab] = useState<'FRAUD_SHIELD' | 'PHISHING'>('FRAUD_SHIELD');
  const [activeScanResult, setActiveScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [chainValid, setChainValid] = useState<boolean | null>(null);
  const [operator, setOperator] = useState<string>('Demo Operator');

  // Initial demo seed log so UI looks active on startup
  useEffect(() => {
    const seedLogs: AuditLogRow[] = [
      {
        id: 'seed-01',
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        operator_id: null,
        module_type: 'FINTECH_KYC',
        verdict: 'GO',
        risk_score: 9,
        confidence: 99,
        flags: [],
        telemetry_summary: {
          faceMatch: '98.5%',
          exif: 'VERIFIED_APPLE_HARDWARE',
          liveness: 'PASSED_PASSIVE_DIFFUSION',
        },
        prev_hash: 'GENESIS_0000000000000000',
        record_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      },
    ];

    setLogs(seedLogs);

    // Check operator session
    if (typeof window !== 'undefined') {
      const isDemo = sessionStorage.getItem('kavachzero_demo_operator');
      if (isDemo) {
        setOperator('Demo Operator (SOC Evaluator)');
      }
    }

    // Attempt to load Supabase logs if configured
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email) {
          setOperator(data.user.email);
        }
      });

      supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setLogs(data as AuditLogRow[]);
          }
        });

      // Subscribe to Realtime postgres_changes
      const channel = supabase
        .channel('realtime_audit_logs')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          (payload) => {
            const newRow = payload.new as AuditLogRow;
            setLogs((prev) => [newRow, ...prev.filter((item) => item.id !== newRow.id)]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Module scan completion handler (implements onScanComplete callback for teammates)
  const handleScanComplete = useCallback(async (input: ModuleScanInput) => {
    setIsProcessing(true);
    try {
      // 1. Evaluate deterministic risk score (0-100) & verdict
      const scanResult = evaluateRisk(input);

      // 2. Cryptographic append to SHA-256 audit ledger
      const supabase = getSupabaseBrowserClient();
      const savedRow = await appendAuditLog(supabase, scanResult, null);

      // 3. Update scanResult with resulting record hash
      scanResult.id = savedRow.id;
      scanResult.prevHash = savedRow.prev_hash;
      scanResult.recordHash = savedRow.record_hash;

      setActiveScanResult(scanResult);

      // 4. Update local log list (if supabase realtime didn't prepend it already)
      setLogs((prev) => {
        if (prev.some((r) => r.id === savedRow.id)) return prev;
        return [savedRow, ...prev];
      });
    } catch (err) {
      console.error('Scan processing pipeline failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSelectRow = (row: AuditLogRow) => {
    const converted: ScanResult = {
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
    setActiveScanResult(converted);
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kavachzero_demo_operator');
    }
    setOperator('Demo Operator');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      {/* Top Navigation */}
      <Navbar
        isConfigured={isSupabaseConfigured}
        chainValid={chainValid}
        operator={operator}
        onSignOut={handleSignOut}
      />

      {/* Real-Time Live Threat Ticker */}
      <LiveThreatTicker logs={logs} />

      {/* Sub-header Configuration Notification (if running purely client-side local memory) */}
      {!isSupabaseConfigured && (
        <div className="w-full bg-cyan-950/40 border-b border-cyan-500/20 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-mono text-cyan-300">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                RUNNING IN ZERO-FRICTION CLIENT SOC MODE: Web Crypto SHA-256 chain is active in local state. To persist to Supabase PostgreSQL, populate <code>.env.local</code>.
              </span>
            </div>
            <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 border border-cyan-500/30">
              Zero-Knowledge Active
            </span>
          </div>
        </div>
      )}

      {/* Main Command Center Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Top Architectural Overview Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">PRIVACY BOUNDARY</p>
              <h4 className="text-xs font-bold text-white">Zero-Knowledge Client-Only</h4>
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Cpu className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">CRYPTOGRAPHIC CHAIN</p>
              <h4 className="text-xs font-bold text-white">SHA-256 Tamper-Evident</h4>
            </div>
          </div>

          <div className="glass-panel p-3.5 rounded-xl border border-white/5 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-slate-400 uppercase">INFRASTRUCTURE COST</p>
              <h4 className="text-xs font-bold text-white">$0 Production Stack</h4>
            </div>
          </div>
        </div>

        {/* Split Glassmorphic SOC Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left/Primary Column: Plug-and-Play Security Modules (7 Cols) */}
          <section className="lg:col-span-7 space-y-4">
            {/* Module Switcher Tabs */}
            <div className="flex items-center space-x-2 p-1.5 rounded-2xl glass-panel border border-white/10">
              <button
                onClick={() => setActiveTab('FRAUD_SHIELD')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'FRAUD_SHIELD'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>1. Fintech Fraud Shield (Member 2)</span>
              </button>

              <button
                onClick={() => setActiveTab('PHISHING')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'PHISHING'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mail className="h-4 w-4 text-cyan-400" />
                <span>2. Phishing Scanner (Member 3)</span>
              </button>
            </div>

            {/* Active Security Module */}
            {activeTab === 'FRAUD_SHIELD' ? (
              <FraudShieldModule
                onScanComplete={handleScanComplete}
                isProcessing={isProcessing}
              />
            ) : (
              <PhishingModule
                onScanComplete={handleScanComplete}
                isProcessing={isProcessing}
              />
            )}
          </section>

          {/* Right Column: Live Forensics & Verdict Assessment (5 Cols) */}
          <section className="lg:col-span-5 space-y-4">
            <RiskVerdictCard
              scanResult={activeScanResult}
              isEvaluating={isProcessing}
            />
            <ForensicsExportBtn scanResult={activeScanResult} />
          </section>

        </div>

        {/* Bottom Full-Width Panel: Tamper-Evident SHA-256 Audit Ledger */}
        <section className="w-full">
          <AuditLedgerTable
            logs={logs}
            onSelectRow={handleSelectRow}
            onChainVerified={(isValid) => setChainValid(isValid)}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs font-mono text-slate-500">
        KavachZero Security Command Center &bull; Built by Harshil Agarwal (Lead Platform Architect) &bull; Zero-Knowledge &bull; Non-Repudiation Audit Chain
      </footer>
    </div>
  );
}
