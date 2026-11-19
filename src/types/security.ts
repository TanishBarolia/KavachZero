export type ModuleSource = 'FINTECH_KYC' | 'PHISHING_SCAN' | 'SANDBOX_TEST';

export type Verdict = 'GO' | 'REVIEW' | 'BLOCK';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScanFlag {
  code: string;
  label: string;
  severity: Severity;
  details: string;
  weight?: number;
}

export interface ModuleScanInput {
  module: ModuleSource;
  rawSubScores: Record<string, number>;
  flags: ScanFlag[];
  metadata: Record<string, string | number | boolean>;
  confidence: number;
}

export interface ScanResult {
  id?: string;
  module: ModuleSource;
  riskScore: number;
  verdict: Verdict;
  confidence: number;
  flags: ScanFlag[];
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
  prevHash?: string;
  recordHash?: string;
}

export interface ModuleProps {
  onScanComplete: (input: ModuleScanInput) => Promise<void>;
  isProcessing?: boolean;
}

export interface AuditLogRow {
  id: string;
  created_at: string;
  operator_id?: string | null;
  module_type: ModuleSource;
  verdict: Verdict;
  risk_score: number;
  confidence: number;
  flags: ScanFlag[];
  telemetry_summary: Record<string, string | number | boolean>;
  prev_hash: string;
  record_hash: string;
}
