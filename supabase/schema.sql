-- KavachZero Audit Ledger Schema
-- $0-cost, privacy-first security operations center schema

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  module_type TEXT NOT NULL CHECK (module_type IN ('FINTECH_KYC', 'PHISHING_SCAN', 'SANDBOX_TEST')),
  verdict TEXT NOT NULL CHECK (verdict IN ('GO', 'REVIEW', 'BLOCK')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence INTEGER NOT NULL DEFAULT 100,
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  telemetry_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT NOT NULL,
  record_hash TEXT NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read for audit & ticker (Zero-Knowledge, only sanitized telemetry stored)
CREATE POLICY "Allow public read for audit & ticker" ON public.audit_logs FOR SELECT USING (true);

-- Allow authenticated operators and demo sessions to insert records
CREATE POLICY "Allow authenticated and demo insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Enable Supabase Realtime broadcast on audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
