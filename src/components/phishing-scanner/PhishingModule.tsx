'use client';

import React, { useState } from 'react';
import { ModuleProps, ModuleScanInput } from '@/types/security';
import { Mail, Sparkles, QrCode, Globe, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export const PhishingModule: React.FC<ModuleProps> = ({
  onScanComplete,
  isProcessing,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const runSimulation = async (preset: 'clean' | 'punycode' | 'quishing') => {
    setSelectedPreset(preset);

    let input: ModuleScanInput;

    if (preset === 'clean') {
      input = {
        module: 'PHISHING_SCAN',
        rawSubScores: {
          urlHomograph: 0,
          entropy: 5,
          nlpUrgency: 10,
          qrRedirect: 0,
        },
        flags: [],
        metadata: {
          targetUrl: 'https://security.examplebank.com/portal',
          dnsRecordStatus: 'VALID_A_AAAA_DNSSEC',
          tldReputationScore: 99.2,
          sslCertIssuer: "Let's Encrypt / DigiCert Standard",
          urgencyKeywordCount: 0,
        },
        confidence: 97,
      };
    } else if (preset === 'punycode') {
      input = {
        module: 'PHISHING_SCAN',
        rawSubScores: {
          urlHomograph: 45,
          entropy: 25,
          nlpUrgency: 20,
          qrRedirect: 0,
        },
        flags: [
          {
            code: 'HOMOGRAPH_PUNYCODE_SPOOF',
            label: 'Cyrillic Character Substitution',
            severity: 'HIGH',
            details: 'Domain "xn--pple-43d.com" mimics "apple.com" using Cyrillic "а" (U+0430).',
          },
          {
            code: 'ENTROPY_RANDOM_SUBDOMAIN',
            label: 'High Shannon Entropy',
            severity: 'MEDIUM',
            details: 'Subdomain "x89j2q01.login-secure" scores entropy 4.6 bits/char indicating algorithmic generation.',
          },
        ],
        metadata: {
          targetUrl: 'https://xn--pple-43d.com/secure-login',
          dnsRecordStatus: 'DYNAMIC_IP_FAST_FLUX',
          tldReputationScore: 12.5,
          sslCertIssuer: 'Cloudflare Inc Free SNI',
          urgencyKeywordCount: 3,
        },
        confidence: 95,
      };
    } else {
      // quishing
      input = {
        module: 'PHISHING_SCAN',
        rawSubScores: {
          urlHomograph: 30,
          entropy: 10,
          nlpUrgency: 15,
          qrRedirect: 35,
        },
        flags: [
          {
            code: 'QR_NESTED_REDIRECT',
            label: 'Quishing QR Code Redirection Chain',
            severity: 'HIGH',
            details: 'Scanned QR barcode initiates 3 consecutive HTTP 302 redirects landing on credential harvester.',
          },
          {
            code: 'NLP_IMPERSONATION_PRESSURE',
            label: 'Urgent Threat Lingo',
            severity: 'MEDIUM',
            details: 'Body text contains coercive cues: "Your account will be suspended within 12 hours".',
          },
        ],
        metadata: {
          targetUrl: 'https://qr-track-shortener.me/r/98124',
          finalRedirectUrl: 'https://suspicious-billing-portal.cc/submit',
          dnsRecordStatus: 'NEWLY_REGISTERED_DOMAIN_24H',
          tldReputationScore: 8.0,
          sslCertIssuer: 'Self-Signed Untrusted Root',
          urgencyKeywordCount: 5,
        },
        confidence: 93,
      };
    }

    await onScanComplete(input);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-5">
      {/* Module Title Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Mail className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              OMNICHANNEL PHISHING SCANNER
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Member 3 Component Integration Slot // Accepts `onScanComplete`
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          Client-Bounded (Zero-Knowledge)
        </span>
      </div>

      {/* Integration Notice / Team Harness */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-xs text-slate-400 leading-relaxed">
        <p className="flex items-center space-x-1.5 text-slate-300 font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Teammate Integration Contract</span>
        </p>
        Member 3 implements the QR code scanner (zxing-wasm), Punycode homograph regex, and local NLP urgency classifier here. Use the presets below to fire live threats into the central Command Center.
      </div>

      {/* Simulation Harness Controls */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block">
          ONE-CLICK SIMULATION HARNESSES:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => runSimulation('clean')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'clean'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'glass-panel hover:border-emerald-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold">1. Clean URL</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Legitimate banking domain with trusted SSL & low entropy (Yields GO)
            </p>
          </button>

          <button
            onClick={() => runSimulation('punycode')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'punycode'
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                : 'glass-panel hover:border-rose-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <Globe className="h-4 w-4 text-rose-400" />
              <span className="text-xs font-bold">2. Punycode Spoof</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Cyrillic homograph + random algorithmic subdomain (Yields BLOCK)
            </p>
          </button>

          <button
            onClick={() => runSimulation('quishing')}
            disabled={isProcessing}
            className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
              selectedPreset === 'quishing'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                : 'glass-panel hover:border-amber-500/30 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <QrCode className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold">3. Quishing QR</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Malicious QR redirect hop + urgent payment pressure (Yields BLOCK)
            </p>
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 text-xs font-mono text-cyan-400 pt-2">
          <Zap className="h-3.5 w-3.5 animate-spin" />
          <span>Hashing telemetry & appending to audit chain...</span>
        </div>
      )}
    </div>
  );
};
