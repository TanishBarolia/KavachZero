import { ScanFlag } from '@/types/security';

export type StepId = 
  | 'consent'
  | 'document'
  | 'forensics'
  | 'liveness'
  | 'facematch'
  | 'review';

export type CheckStatus = 'PASSED' | 'SUSPICIOUS' | 'INCONCLUSIVE' | 'NOT_PERFORMED';

export interface DocumentValidationResult {
  isValid: boolean;
  format: 'jpeg' | 'png' | 'webp' | 'unknown';
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  blurScore: number;
  isBlurry: boolean;
  contrastScore: number;
  isLowContrast: boolean;
  glareScore: number;
  hasGlare: boolean;
  error?: string;
}

export interface ExifReport {
  present: boolean;
  make?: string;
  model?: string;
  software?: string;
  modifyDate?: string;
  dateTimeOriginal?: string;
  hasGps: boolean;
  isEditedSoftware: boolean;
  suspiciousReasons: string[];
}

export interface ElaFinding {
  anomalyScore: number; // 0 to 1
  isManipulated: boolean;
  highVarianceBlocks: number;
  totalBlocks: number;
  suspiciousRegions: Array<{ x: number; y: number; width: number; height: number; score: number }>;
  caveat: string;
}

export interface MrzFieldResult {
  raw: string;
  documentType?: string;
  issuingCountry?: string;
  documentNumber?: string;
  documentNumberCheck?: boolean;
  birthDate?: string;
  birthDateCheck?: boolean;
  expiryDate?: string;
  expiryDateCheck?: boolean;
  compositeCheck?: boolean;
  valid: boolean;
}

export interface OcrResult {
  text: string;
  confidence: number;
  mrz?: MrzFieldResult;
  extractedFields: Record<string, string>;
  status: CheckStatus;
}

export interface LivenessChallenge {
  id: 'blink' | 'turn_left' | 'turn_right' | 'smile' | 'open_mouth';
  label: string;
  instruction: string;
  completed: boolean;
  elapsedMs: number;
}

export interface LivenessSessionResult {
  challenges: LivenessChallenge[];
  allPassed: boolean;
  sessionDurationMs: number;
  naturalMotionDetected: boolean;
  screenReplaySuspected: boolean;
  status: CheckStatus;
}

export interface FaceMatchResult {
  similarity: number; // 0 to 100
  status: CheckStatus;
  band: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'MISMATCH' | 'INCONCLUSIVE' | 'NOT_PERFORMED';
  limitationsNotice: string;
}

export interface KycSessionState {
  currentStep: StepId;
  documentFile: File | null;
  documentPreviewUrl: string | null;
  documentValidation: DocumentValidationResult | null;
  exif: ExifReport | null;
  ela: ElaFinding | null;
  ocr: OcrResult | null;
  idFaceCropUrl: string | null;
  selfieCropUrl: string | null;
  liveness: LivenessSessionResult | null;
  faceMatch: FaceMatchResult | null;
  subScores: {
    liveness: number;
    elaExif: number;
    ocr: number;
  };
  flags: ScanFlag[];
  confidence: number;
  isAnalyzingDoc: boolean;
  isSubmitting: boolean;
  submissionComplete: boolean;
  errorMessage: string | null;
}
