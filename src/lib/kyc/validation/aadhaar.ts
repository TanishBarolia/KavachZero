import { validateVerhoeffChecksum } from './verhoeff';

export interface AadhaarValidationResult {
  isAadhaarCard: boolean;
  aadhaarNumber?: string;
  isVerhoeffValid: boolean;
  isMockPattern: boolean;
  hasEmblemOrHeader: boolean;
  reasons: string[];
  status: 'AUTHENTIC' | 'SUSPICIOUS_FAKE' | 'INVALID_CHECKSUM' | 'NOT_AADHAAR';
}

const KNOWN_MOCK_PATTERNS = [
  '000011112222',
  '123456789012',
  '111122223333',
  '999999999999',
  '000000000000',
  '123412341234',
  '222233334444',
  '111111111111',
];

/**
 * Validates text or raw input extracted from an Indian Aadhaar card
 */
export function validateAadhaarDocument(ocrText: string): AadhaarValidationResult {
  const upper = ocrText.toUpperCase();
  const reasons: string[] = [];

  const hasAadhaarKeywords =
    upper.includes('GOVERNMENT OF INDIA') ||
    upper.includes('BHARAT SARKAR') ||
    upper.includes('UNIQUE IDENTIFICATION') ||
    upper.includes('AADHAAR') ||
    upper.includes('आधार') ||
    upper.includes('UIDAI') ||
    upper.includes('DOB') ||
    upper.includes('MALE') ||
    upper.includes('FEMALE') ||
    upper.includes('YEAR OF BIRTH');

  // Look for 12-digit number format: 4 digits + space/dash + 4 digits + space/dash + 4 digits, or 12 continuous digits
  const match =
    ocrText.match(/\b([0-9]{4}[\s-][0-9]{4}[\s-][0-9]{4})\b/) ||
    ocrText.match(/\b([0-9]{12})\b/) ||
    ocrText.match(/([0-9]{4}\s+[0-9]{4}\s+[0-9]{4})/);

  if (!hasAadhaarKeywords && !match) {
    return {
      isAadhaarCard: false,
      isVerhoeffValid: false,
      isMockPattern: false,
      hasEmblemOrHeader: false,
      reasons: ['No Aadhaar markers identified.'],
      status: 'NOT_AADHAAR',
    };
  }

  if (!match) {
    reasons.push('Aadhaar layout detected but 12-digit UID number is unreadable or obscured.');
    return {
      isAadhaarCard: true,
      isVerhoeffValid: false,
      isMockPattern: false,
      hasEmblemOrHeader: hasAadhaarKeywords,
      reasons,
      status: 'SUSPICIOUS_FAKE',
    };
  }

  const rawNumber = match[0].replace(/[\s-]/g, '');
  const isMockPattern = KNOWN_MOCK_PATTERNS.includes(rawNumber) || /^(\d)\1{11}$/.test(rawNumber) || rawNumber === '000011112222';
  const isVerhoeffValid = validateVerhoeffChecksum(rawNumber);

  if (isMockPattern) {
    reasons.push(`Aadhaar number (${match[0]}) is a known dummy/sample sequence.`);
  }

  if (!isVerhoeffValid) {
    reasons.push(`Aadhaar number (${match[0]}) fails mandatory UIDAI Verhoeff mathematical checksum.`);
  }

  let status: AadhaarValidationResult['status'] = 'AUTHENTIC';
  if (isMockPattern || !isVerhoeffValid) {
    status = 'SUSPICIOUS_FAKE';
  }

  return {
    isAadhaarCard: true,
    aadhaarNumber: match[0],
    isVerhoeffValid,
    isMockPattern,
    hasEmblemOrHeader: hasAadhaarKeywords,
    reasons,
    status,
  };
}
