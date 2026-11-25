import { createWorker } from 'tesseract.js';
import { OcrResult, MrzFieldResult } from '../types';
import { validateAadhaarDocument, AadhaarValidationResult } from '../validation/aadhaar';

/**
 * Validates check digit per ICAO Doc 9303 (weights 7, 3, 1 repeating)
 */
function verifyIcaoCheckDigit(str: string, expectedCheckChar: string): boolean {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    let val = 0;
    if (char >= '0' && char <= '9') {
      val = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      val = char.charCodeAt(0) - 55;
    } else if (char === '<') {
      val = 0;
    }
    sum += val * weights[i % 3];
  }

  const computed = (sum % 10).toString();
  return computed === expectedCheckChar;
}

/**
 * Extracts and parses Machine Readable Zone (MRZ) per ICAO 9303 (TD3/TD1)
 */
export function parseMrzLines(rawText: string): MrzFieldResult | undefined {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim().toUpperCase().replace(/\s+/g, ''))
    .filter((l) => l.includes('<<') || l.length >= 28);

  const td3Line1 = lines.find((l) => l.length >= 40 && (l.startsWith('P<') || l.startsWith('P')));
  const td3Line2 = lines.find((l) => l !== td3Line1 && l.length >= 40 && /[0-9<]{10,}/.test(l));

  if (td3Line1 && td3Line2) {
    const docNum = td3Line2.substring(0, 9);
    const docNumCheck = td3Line2.substring(9, 10);
    const birthDate = td3Line2.substring(13, 19);
    const birthCheck = td3Line2.substring(19, 20);
    const expiryDate = td3Line2.substring(21, 27);
    const expiryCheck = td3Line2.substring(27, 28);

    const docValid = verifyIcaoCheckDigit(docNum, docNumCheck);
    const birthValid = verifyIcaoCheckDigit(birthDate, birthCheck);
    const expiryValid = verifyIcaoCheckDigit(expiryDate, expiryCheck);

    return {
      raw: `${td3Line1}\n${td3Line2}`,
      documentType: 'PASSPORT_TD3',
      issuingCountry: td3Line1.substring(2, 5).replace(/</g, ''),
      documentNumber: docNum.replace(/</g, ''),
      documentNumberCheck: docValid,
      birthDate,
      birthDateCheck: birthValid,
      expiryDate,
      expiryDateCheck: expiryValid,
      valid: docValid && birthValid && expiryValid,
    };
  }

  return undefined;
}

export interface ExtendedOcrResult extends OcrResult {
  aadhaar?: AadhaarValidationResult;
}

/**
 * Runs Tesseract OCR on document image locally and executes national ID validators (Aadhaar & Passport)
 */
export async function runDocumentOcr(imageFile: File): Promise<ExtendedOcrResult> {
  let worker;
  try {
    worker = await createWorker('eng', 1, {
      errorHandler: () => {},
      logger: () => {},
    });

    const ret = await worker.recognize(imageFile);
    const rawText = ret.data.text || '';
    const confidence = ret.data.confidence || 0;

    await worker.terminate();

    const mrz = parseMrzLines(rawText);
    const aadhaar = validateAadhaarDocument(rawText);

    const extractedFields: Record<string, string> = {};
    if (mrz?.documentNumber) extractedFields.documentNumber = mrz.documentNumber;
    if (mrz?.issuingCountry) extractedFields.country = mrz.issuingCountry;
    if (aadhaar.aadhaarNumber) extractedFields.aadhaarNumber = aadhaar.aadhaarNumber;

    let status: OcrResult['status'] = 'PASSED';

    // Critical: If Aadhaar card is fake (fails Verhoeff or has dummy numbers like 0000 1111 2222)
    if (aadhaar.isAadhaarCard) {
      if (aadhaar.status === 'SUSPICIOUS_FAKE') {
        status = 'SUSPICIOUS';
      } else {
        status = 'PASSED';
      }
    } else if (mrz && !mrz.valid) {
      status = 'SUSPICIOUS';
    } else if (confidence < 40 && !mrz) {
      status = 'INCONCLUSIVE';
    }

    return {
      text: rawText.slice(0, 300),
      confidence: Math.round(confidence),
      mrz,
      aadhaar,
      extractedFields,
      status,
    };
  } catch {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }

    return {
      text: '',
      confidence: 0,
      extractedFields: {},
      status: 'INCONCLUSIVE',
    };
  }
}
