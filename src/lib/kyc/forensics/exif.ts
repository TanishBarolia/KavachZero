import exifr from 'exifr';
import { ExifReport } from '../types';

const SUSPICIOUS_EDIT_SIGNATURES = [
  'adobe',
  'photoshop',
  'gimp',
  'canva',
  'paint.net',
  'lightroom',
  'snapseed',
  'pixlr',
  'corel',
];

/**
 * Extracts and parses EXIF metadata directly from raw file bytes without leaking PII
 */
export async function analyzeExif(file: File): Promise<ExifReport> {
  try {
    const rawData = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: false,
      iptc: false,
      gps: true, // Only to check presence
    });

    if (!rawData) {
      return {
        present: false,
        hasGps: false,
        isEditedSoftware: false,
        suspiciousReasons: ['No EXIF metadata block found (common for screenshots, web saves, or scrubbed scans).'],
      };
    }

    const softwareStr = (rawData.Software || rawData.CreatorTool || '').toString().toLowerCase();
    const make = rawData.Make ? String(rawData.Make) : undefined;
    const model = rawData.Model ? String(rawData.Model) : undefined;

    let isEditedSoftware = false;
    for (const sig of SUSPICIOUS_EDIT_SIGNATURES) {
      if (softwareStr.includes(sig)) {
        isEditedSoftware = true;
        break;
      }
    }

    const suspiciousReasons: string[] = [];

    if (isEditedSoftware) {
      suspiciousReasons.push(`Image manipulation software signature present in metadata: "${rawData.Software || rawData.CreatorTool}".`);
    }

    // Timestamp consistency check
    const modifyDate = rawData.ModifyDate ? new Date(rawData.ModifyDate).toISOString() : undefined;
    const dateTimeOriginal = rawData.DateTimeOriginal ? new Date(rawData.DateTimeOriginal).toISOString() : undefined;

    if (modifyDate && dateTimeOriginal && modifyDate !== dateTimeOriginal) {
      suspiciousReasons.push('File ModifyDate diverges from DateTimeOriginal, indicating post-capture modification.');
    }

    // Check future date
    if (dateTimeOriginal && new Date(dateTimeOriginal).getTime() > Date.now() + 86400000) {
      suspiciousReasons.push('EXIF capture date is set in the future.');
    }

    return {
      present: true,
      make,
      model,
      software: rawData.Software || rawData.CreatorTool,
      modifyDate,
      dateTimeOriginal,
      hasGps: Boolean(rawData.latitude !== undefined && rawData.longitude !== undefined),
      isEditedSoftware,
      suspiciousReasons,
    };
  } catch {
    return {
      present: false,
      hasGps: false,
      isEditedSoftware: false,
      suspiciousReasons: ['Unable to parse EXIF metadata stream.'],
    };
  }
}
