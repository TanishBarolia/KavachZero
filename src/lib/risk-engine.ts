import { ModuleScanInput, ScanResult, Verdict } from '@/types/security';

/**
 * Computes a standardized 0-100 risk score and verdict based on module input.
 * Deterministic scoring engine with zero-knowledge telemetry.
 */
export function evaluateRisk(input: ModuleScanInput): ScanResult {
  let score = 0;

  if (input.module === 'FINTECH_KYC') {
    // KYC sub-scores: liveness (40%), elaExif (35%), ocr (25%)
    const liveness = input.rawSubScores.liveness ?? input.rawSubScores.default ?? 0;
    const elaExif = input.rawSubScores.elaExif ?? input.rawSubScores.default ?? 0;
    const ocr = input.rawSubScores.ocr ?? input.rawSubScores.default ?? 0;

    score = Math.round(0.40 * liveness + 0.35 * elaExif + 0.25 * ocr);
  } else if (input.module === 'PHISHING_SCAN') {
    // Phishing sub-scores: additive/capped score from urlHomograph, entropy, nlpUrgency, qrRedirect
    const urlHomograph = input.rawSubScores.urlHomograph ?? 0;
    const entropy = input.rawSubScores.entropy ?? 0;
    const nlpUrgency = input.rawSubScores.nlpUrgency ?? 0;
    const qrRedirect = input.rawSubScores.qrRedirect ?? 0;

    const sum = urlHomograph + entropy + nlpUrgency + qrRedirect;
    score = Math.min(100, Math.round(sum > 0 ? sum : (input.rawSubScores.default ?? 0)));
  } else {
    // Fallback: clamp direct composite or default sub-score
    const direct = input.rawSubScores.composite ?? input.rawSubScores.default ?? 0;
    score = Math.round(direct);
  }

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine verdict
  let verdict: Verdict = 'GO';
  if (score >= 70) {
    verdict = 'BLOCK';
  } else if (score >= 31) {
    verdict = 'REVIEW';
  } else {
    verdict = 'GO';
  }

  return {
    module: input.module,
    riskScore: score,
    verdict,
    confidence: Math.max(1, Math.min(100, input.confidence ?? 95)),
    flags: input.flags || [],
    metadata: input.metadata || {},
    timestamp: new Date().toISOString(),
  };
}
