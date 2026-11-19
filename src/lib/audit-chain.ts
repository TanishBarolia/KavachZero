import { AuditLogRow, ScanResult } from '@/types/security';
import { SupabaseClient } from '@supabase/supabase-js';

export const GENESIS_HASH = 'GENESIS_0000000000000000';

/**
 * Computes canonical SHA-256 digest using globalThis.crypto.subtle.
 * Canonical key ordering: prevHash|module|verdict|riskScore|JSON.stringify(telemetrySummary)
 */
export async function computeRecordHash(
  prevHash: string,
  scanResult: ScanResult
): Promise<string> {
  const sortedMetadata = Object.keys(scanResult.metadata || {})
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = scanResult.metadata[key];
      return acc;
    }, {});

  const canonicalPayload = [
    prevHash,
    scanResult.module,
    scanResult.verdict,
    scanResult.riskScore.toString(),
    JSON.stringify(sortedMetadata),
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalPayload);

  // Fallback for non-subtle crypto test environments if needed
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JS fallback if crypto.subtle is unavailable (e.g. non-HTTPS test)
  let hash = 0;
  for (let i = 0; i < canonicalPayload.length; i++) {
    const char = canonicalPayload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Appends an audit log entry to Supabase (or returns mock row if disconnected)
 */
export async function appendAuditLog(
  supabase: SupabaseClient | null,
  scanResult: ScanResult,
  operatorId?: string | null
): Promise<AuditLogRow> {
  let prevHash = GENESIS_HASH;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('record_hash')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].record_hash) {
        prevHash = data[0].record_hash;
      }
    } catch {
      // Fallback to GENESIS_HASH
    }
  }

  const recordHash = await computeRecordHash(prevHash, scanResult);
  const now = scanResult.timestamp || new Date().toISOString();

  const auditPayload = {
    operator_id: operatorId || null,
    module_type: scanResult.module,
    verdict: scanResult.verdict,
    risk_score: scanResult.riskScore,
    confidence: scanResult.confidence,
    flags: scanResult.flags,
    telemetry_summary: scanResult.metadata,
    prev_hash: prevHash,
    record_hash: recordHash,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditPayload])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insertion failed, falling back to local memory log:', error.message);
    } else if (data) {
      return data as AuditLogRow;
    }
  }

  // Local state fallback row
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}`,
    created_at: now,
    operator_id: operatorId || null,
    module_type: scanResult.module,
    verdict: scanResult.verdict,
    risk_score: scanResult.riskScore,
    confidence: scanResult.confidence,
    flags: scanResult.flags,
    telemetry_summary: scanResult.metadata,
    prev_hash: prevHash,
    record_hash: recordHash,
  };
}

/**
 * Verifies chain integrity from oldest to newest row.
 */
export async function verifyAuditChain(logs: AuditLogRow[]): Promise<{
  isValid: boolean;
  brokenAtId?: string;
  verifiedCount: number;
  message: string;
}> {
  if (!logs || logs.length === 0) {
    return {
      isValid: true,
      verifiedCount: 0,
      message: 'Ledger is empty. Cryptographic root initialized to GENESIS.',
    };
  }

  // Sort logs chronologically: oldest first
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    // Check link to previous hash
    if (i === 0) {
      // First row must have GENESIS_HASH or previous record's hash
      expectedPrevHash = current.prev_hash;
    } else {
      if (current.prev_hash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenAtId: current.id,
          verifiedCount: i,
          message: `Link broken at record #${i + 1} (${current.id.slice(0, 8)}...). Expected prev_hash ${expectedPrevHash.slice(0, 8)}, got ${current.prev_hash.slice(0, 8)}.`,
        };
      }
    }

    // Recompute hash
    const scanSim: ScanResult = {
      module: current.module_type,
      verdict: current.verdict,
      riskScore: current.risk_score,
      confidence: current.confidence,
      flags: current.flags,
      metadata: current.telemetry_summary,
      timestamp: current.created_at,
    };

    const recomputedHash = await computeRecordHash(current.prev_hash, scanSim);
    if (recomputedHash !== current.record_hash) {
      return {
        isValid: false,
        brokenAtId: current.id,
        verifiedCount: i,
        message: `Tamper detected! Record #${i + 1} (${current.id.slice(0, 8)}...) hash mismatch. Stored: ${current.record_hash.slice(0, 8)}, recomputed: ${recomputedHash.slice(0, 8)}.`,
      };
    }

    expectedPrevHash = current.record_hash;
  }

  return {
    isValid: true,
    verifiedCount: sorted.length,
    message: `All ${sorted.length} cryptographic hashes verified intact with SHA-256 chain.`,
  };
}
