export const KYC_CONFIG = {
  // Document limits
  MAX_FILE_BYTES: 10 * 1024 * 1024, // 10 MB
  MIN_DIMENSION_PX: 500,
  MAX_DIMENSION_PX: 6000,
  MAX_MEGAPIXELS: 25,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Quality heuristics (uncalibrated screening rules)
  BLUR_THRESHOLD_LAPLACIAN: 85,
  LOW_CONTRAST_THRESHOLD_STDDEV: 28,
  GLARE_PIXEL_PERCENT_THRESHOLD: 0.12,

  // Forensics (ELA)
  ELA_JPEG_QUALITY: 0.90,
  ELA_ANOMALY_RATIO_TRIGGER: 0.22,
  ELA_DIFF_AMPLIFIER: 12,

  // Liveness
  DEFAULT_CHALLENGE_TIMEOUT_MS: 6000,
  REQUIRED_CHALLENGE_COUNT: 2,
  EYE_ASPECT_RATIO_BLINK_THRESHOLD: 0.20,
  YAW_TURN_THRESHOLD_DEGREES: 18,
  SMILE_MOUTH_CORNER_RATIO_DELTA: 0.08,

  // Risk sub-score base values for INCONCLUSIVE states
  INCONCLUSIVE_SUB_SCORE: 35, // Never 0 (which means safe)
  DEFAULT_CONFIDENCE: 92,

  // Metadata whitelist schema version
  SCHEMA_VERSION: '1.2.0-fintech-soc',
} as const;
