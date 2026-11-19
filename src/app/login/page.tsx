'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Shield, KeyRound, UserCheck, ArrowRight, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. You can click "Continue as Demo Operator" below to evaluate the system in zero-friction demo mode.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Could not initialize Supabase client.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Sign-up link dispatched! Check your email or log in if auto-confirm is enabled.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoOperator = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('kavachzero_demo_operator', 'true');
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 border border-white/10 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-[1px] shadow-lg shadow-cyan-500/20 mb-2">
            <div className="h-full w-full bg-[#060913] rounded-[15px] flex items-center justify-center">
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white">
            KAVACH<span className="text-cyan-400">ZERO</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            OPERATOR AUTHENTICATION GATEWAY
          </p>
        </div>

        {/* Demo Mode Direct Pass Banner */}
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 space-y-2">
          <div className="flex items-center space-x-2 text-cyan-300 text-xs font-semibold">
            <UserCheck className="h-4 w-4" />
            <span>Frictionless Evaluator Access</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Testing for hackathon evaluation? Skip credentials and enter the live Security Operations Center with full cryptographic hashing enabled.
          </p>
          <button
            type="button"
            onClick={handleDemoOperator}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
          >
            <span>Continue as Demo Operator</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-[#060913] px-3 text-[10px] uppercase font-mono text-slate-400 shrink-0">
            Or Sign In with Supabase
          </span>
        </div>

        {/* Error or Message Alerts */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Supabase Email/Pass Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              OPERATOR EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@defense.gov"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1">
              OPERATOR PASSPHRASE
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl glass-panel hover:bg-white/10 text-white font-medium text-xs border border-white/10 transition disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 text-cyan-400" />
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Create Operator Account' : 'Sign In with Supabase'}</span>
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[11px] text-slate-400 hover:text-cyan-400 transition"
          >
            {isSignUp
              ? 'Already registered? Sign in instead.'
              : "Need an operator login? Sign up."}
          </button>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 font-mono transition"
          >
            ← Back to Command Center
          </Link>
        </div>

      </div>
    </div>
  );
}
