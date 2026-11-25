import { ScanFlag, ModuleScanInput } from '@/types/security';
import { KycSessionState } from '../types';
import { KYC_CONFIG } from '../config';

/**
 * Computes deterministic integer 0-100 risk sub-scores from forensic & liveness signals
 */
export function calculateSubScores(state: KycSessionState): {
  liveness: number;
  elaExif: number;
  ocr: number;
} {
  // 1. Liveness (biometric session + face binding)
  let livenessRisk = 8;
  if (!state.liveness) {
    livenessRisk = KYC_CONFIG.INCONCLUSIVE_SUB_SCORE;
  } else if (!state.liveness.allPassed) {
    livenessRisk = 92;
  } else if (state.liveness.screenReplaySuspected) {
    livenessRisk = 75;
  }

  // Face-match binding check
  if (state.faceMatch) {
    if (state.faceMatch.band === 'MISMATCH') {
      livenessRisk = Math.max(livenessRisk, 86);
    } else if (state.faceMatch.band === 'MODERATE_MATCH') {
      livenessRisk = Math.max(livenessRisk, 38);
    } else if (state.faceMatch.band === 'STRONG_MATCH') {
      // If screen replay attack was suspected, maintain elevated risk despite matching face!
      if (!state.liveness?.screenReplaySuspected) {
        livenessRisk = Math.min(livenessRisk, 10);
      }
    }
  }

  // 2. ELA & EXIF (forensic document integrity)
  let forensicRisk = 10;
  if (state.ela?.isManipulated) {
    forensicRisk += 45;
  }
  if (state.exif?.isEditedSoftware) {
    forensicRisk += 35;
  }
  if (state.exif?.suspiciousReasons && state.exif.suspiciousReasons.length > 0) {
    forensicRisk += 15;
  }
  if (!state.ela && !state.exif) {
    forensicRisk = KYC_CONFIG.INCONCLUSIVE_SUB_SCORE;
  }
  forensicRisk = Math.min(100, Math.max(0, forensicRisk));

  // 3. OCR (content integrity & check digit agreement)
  let ocrRisk = 5;
  // Aadhaar specific check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aadhaar = (state.ocr as any)?.aadhaar;
  if (aadhaar?.isAadhaarCard) {
    if (aadhaar.status === 'SUSPICIOUS_FAKE' || !aadhaar.isVerhoeffValid || aadhaar.isMockPattern) {
      ocrRisk = 95; // Extreme risk for counterfeit Aadhaar
    } else {
      ocrRisk = 8;
    }
  } else if (state.ocr?.mrz && !state.ocr.mrz.valid) {
    ocrRisk = 85;
  } else if (state.ocr?.status === 'INCONCLUSIVE') {
    ocrRisk = KYC_CONFIG.INCONCLUSIVE_SUB_SCORE;
  } else if (state.ocr?.status === 'SUSPICIOUS') {
    ocrRisk = 70;
  }

  return {
    liveness: Math.round(livenessRisk),
    elaExif: Math.round(forensicRisk),
    ocr: Math.round(ocrRisk),
  };
}

/**
 * Builds sanitized ScanFlag array adhering to whitelist without leaking PII
 */
export function deriveScanFlags(state: KycSessionState): ScanFlag[] {
  const flags: ScanFlag[] = [];

  // Aadhaar flags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aadhaar = (state.ocr as any)?.aadhaar;
  if (aadhaar?.isAadhaarCard && (aadhaar.isMockPattern || !aadhaar.isVerhoeffValid)) {
    flags.push({
      code: 'OCR_AADHAAR_CHECKSUM_INVALID',
      label: 'Counterfeit / Sample Aadhaar Number',
      severity: 'HIGH',
      details: aadhaar.reasons[0] || '12-digit Aadhaar UID failed Verhoeff mathematical algorithm.',
    });
  }

  if (state.faceMatch && state.faceMatch.band === 'MISMATCH') {
    flags.push({
      code: 'FACE_BIOMETRIC_MISMATCH',
      label: 'Live Selfie Does Not Match ID Portrait',
      severity: 'HIGH',
      details: `Face feature similarity index is only ${state.faceMatch.similarity}%. Does not bind to document.`,
    });
  }

  if (state.liveness?.screenReplaySuspected) {
    flags.push({
      code: 'LIVENESS_SCREEN_REPLAY_INDICATOR',
      label: 'Presentation Attack: Screen Replay Detected',
      severity: 'HIGH',
      details: 'Moiré subpixel frequency, phone bezel borders, or specular glass reflections detected during webcam scan.',
    });
  }

  if (state.liveness && !state.liveness.allPassed) {
    flags.push({
      code: 'LIVENESS_CHALLENGE_FAILED',
      label: 'Interactive Liveness Incomplete',
      severity: 'HIGH',
      details: 'Active biometric challenge response was not detected within the window.',
    });
  }

  if (state.ela?.isManipulated) {
    flags.push({
      code: 'ELA_BOUNDARY_SPLICING',
      label: 'Compression Anomaly Detected',
      severity: 'HIGH',
      details: `Regional error-level variance exceeds baseline threshold by ${(state.ela.anomalyScore * 100).toFixed(0)}%.`,
    });
  }

  if (state.exif?.isEditedSoftware) {
    flags.push({
      code: 'EXIF_EDIT_SOFTWARE',
      label: 'Raster Manipulation Signature',
      severity: 'MEDIUM',
      details: `EXIF software descriptor indicates editing via: ${state.exif.software || 'Editing tool'}.`,
    });
  }

  return flags;
}

/**
 * Builds final ModuleScanInput guaranteeing only flat, sanitized primitives are emitted
 */
export function buildScanInput(state: KycSessionState): ModuleScanInput {
  const subScores = calculateSubScores(state);
  const flags = deriveScanFlags(state);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aadhaar = (state.ocr as any)?.aadhaar;

  const metadata: Record<string, string | number | boolean> = {
    kycSchemaVersion: KYC_CONFIG.SCHEMA_VERSION,
    faceMatchConfidence: state.faceMatch?.similarity ?? 0,
    elaAnomalyScore: state.ela?.anomalyScore ?? 0,
    exifIntegrity: state.exif?.isEditedSoftware
      ? 'MODIFIED_EDIT_SIGNATURE'
      : state.exif?.present
      ? 'VERIFIED_CAPTURE_ORIGIN'
      : 'STRIPPED_OR_ABSENT',
    ocrSanityStatus: aadhaar?.isAadhaarCard
      ? aadhaar.status === 'SUSPICIOUS_FAKE'
        ? 'AADHAAR_VERHOEFF_FAILED'
        : 'AADHAAR_VERHOEFF_VERIFIED'
      : state.ocr?.mrz?.valid
      ? 'ICAO_MRZ_VERIFIED'
      : state.ocr?.status === 'PASSED'
      ? 'LEGIBLE_VISUAL_ZONE'
      : 'SUSPICIOUS_CONTENT',
    captureLatencyMs: state.liveness?.sessionDurationMs ?? 420,
    clientTrust: 'UNATTESTED_CLIENT',
    mrzChecksumValid: state.ocr?.mrz?.valid ?? false,
    exifPresent: state.exif?.present ?? false,
    editingSoftwareTagDetected: state.exif?.isEditedSoftware ?? false,
    docImageFormat: state.documentValidation?.format ?? 'unknown',
  };

  return {
    module: 'FINTECH_KYC',
    rawSubScores: subScores,
    flags,
    metadata,
    confidence: state.confidence || 95,
  };
}
