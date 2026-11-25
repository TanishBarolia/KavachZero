import { KYC_CONFIG } from '../config';
import { DocumentValidationResult } from '../types';

/**
 * Sniffs first bytes of an ArrayBuffer to detect true file format
 */
export function sniffMagicBytes(buffer: ArrayBuffer): 'jpeg' | 'png' | 'webp' | 'unknown' {
  const bytes = new Uint8Array(buffer.slice(0, 16));
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return 'unknown';
}

/**
 * Validates document image bounds, file format, blur, and glare
 */
export async function validateDocumentFile(file: File): Promise<DocumentValidationResult> {
  if (file.size > KYC_CONFIG.MAX_FILE_BYTES) {
    return {
      isValid: false,
      format: 'unknown',
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 0,
      isBlurry: false,
      contrastScore: 0,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const format = sniffMagicBytes(arrayBuffer);

  if (format === 'unknown') {
    return {
      isValid: false,
      format: 'unknown',
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 0,
      isBlurry: false,
      contrastScore: 0,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
      error: 'Unrecognized file structure or corrupted image. Please upload a genuine JPEG, PNG, or WebP.',
    };
  }

  // Measure dimensions and pixel statistics via ImageBitmap
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      isValid: false,
      format,
      width: 0,
      height: 0,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 0,
      isBlurry: false,
      contrastScore: 0,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
      error: 'Failed to decode image pixels. Ensure file is not corrupt.',
    };
  }

  const width = bitmap.width;
  const height = bitmap.height;
  const megaPixels = (width * height) / 1_000_000;

  if (megaPixels > KYC_CONFIG.MAX_MEGAPIXELS) {
    bitmap.close();
    return {
      isValid: false,
      format,
      width,
      height,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 0,
      isBlurry: false,
      contrastScore: 0,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
      error: 'Image resolution is excessively high (>25 MP decompression guard).',
    };
  }

  if (width < KYC_CONFIG.MIN_DIMENSION_PX || height < KYC_CONFIG.MIN_DIMENSION_PX) {
    bitmap.close();
    return {
      isValid: false,
      format,
      width,
      height,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 0,
      isBlurry: false,
      contrastScore: 0,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
      error: `Resolution too low (${width}x${height}px). Minimum 500x500px required for document inspection.`,
    };
  }

  // Draw scaled down thumbnail onto offscreen canvas to analyze blur and contrast
  const analysisWidth = Math.min(width, 400);
  const analysisHeight = Math.round((height / width) * analysisWidth);

  const canvas = document.createElement('canvas');
  canvas.width = analysisWidth;
  canvas.height = analysisHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    bitmap.close();
    return {
      isValid: true,
      format,
      width,
      height,
      sizeBytes: file.size,
      mimeType: file.type,
      blurScore: 100,
      isBlurry: false,
      contrastScore: 50,
      isLowContrast: false,
      glareScore: 0,
      hasGlare: false,
    };
  }

  ctx.drawImage(bitmap, 0, 0, analysisWidth, analysisHeight);
  bitmap.close();

  const imgData = ctx.getImageData(0, 0, analysisWidth, analysisHeight);
  const data = imgData.data;

  // Grayscale & metrics calculation
  let sumLuma = 0;
  let sumSqLuma = 0;
  let glarePixels = 0;
  const totalPixels = analysisWidth * analysisHeight;

  // Convert to grayscale array for Laplacian variance
  const gray = new Float32Array(totalPixels);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[j] = luma;
    sumLuma += luma;
    sumSqLuma += luma * luma;
    if (luma > 248) {
      glarePixels++;
    }
  }

  const meanLuma = sumLuma / totalPixels;
  const varianceLuma = Math.max(0, sumSqLuma / totalPixels - meanLuma * meanLuma);
  const stdDevLuma = Math.sqrt(varianceLuma);

  // Simplified discrete Laplacian approximation on grid
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let edgeCount = 0;

  for (let y = 1; y < analysisHeight - 1; y += 2) {
    for (let x = 1; x < analysisWidth - 1; x += 2) {
      const idx = y * analysisWidth + x;
      const center = gray[idx];
      const val =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - analysisWidth] +
        gray[idx + analysisWidth] -
        4 * center;
      laplacianSum += val;
      laplacianSqSum += val * val;
      edgeCount++;
    }
  }

  const meanLap = laplacianSum / Math.max(1, edgeCount);
  const blurScore = Math.max(0, laplacianSqSum / Math.max(1, edgeCount) - meanLap * meanLap);
  const isBlurry = blurScore < KYC_CONFIG.BLUR_THRESHOLD_LAPLACIAN;
  const isLowContrast = stdDevLuma < KYC_CONFIG.LOW_CONTRAST_THRESHOLD_STDDEV;
  const glareRatio = glarePixels / totalPixels;
  const hasGlare = glareRatio > KYC_CONFIG.GLARE_PIXEL_PERCENT_THRESHOLD;

  // Dereference canvas
  canvas.width = 0;
  canvas.height = 0;

  return {
    isValid: true,
    format,
    width,
    height,
    sizeBytes: file.size,
    mimeType: file.type,
    blurScore: Math.round(blurScore),
    isBlurry,
    contrastScore: Math.round(stdDevLuma),
    isLowContrast,
    glareScore: Math.round(glareRatio * 100),
    hasGlare,
  };
}
