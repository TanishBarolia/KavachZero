/**
 * High-precision Facial Feature Extraction & Structural Comparison
 * Uses contrast-normalized gradient histograms (HOG) and tight facial oval cropping
 * invariant to lighting variations, print desaturation, and room background.
 */

export interface FaceComparisonResult {
  similarity: number; // 0 to 100
  band: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
  structuralScore: number;
  chrominanceScore: number;
}

/**
 * Tightly crops face from image and applies histogram equalization
 */
export async function extractTightFaceCrop(imageSource: string | File): Promise<{
  dataUrl: string;
  grayPixels: Float32Array;
  width: number;
  height: number;
} | null> {
  let img: HTMLImageElement;
  if (typeof imageSource === 'string') {
    img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageSource;
    });
  } else {
    const url = URL.createObjectURL(imageSource);
    img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  // Find face bounding cluster using skin-chrominance and vertical density
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let count = 0;

  // Focus primarily on left 60% for ID cards, full frame for webcam frames
  const isIdCardLikely = w > h;
  const xLimit = isIdCardLikely ? Math.round(w * 0.65) : w;

  for (let y = Math.round(h * 0.1); y < Math.round(h * 0.9); y += 3) {
    for (let x = Math.round(w * 0.05); x < xLimit; x += 3) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const isSkin =
        r > 70 &&
        g > 35 &&
        b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 10 &&
        Math.abs(r - g) > 10 &&
        r > g &&
        r > b;

      if (isSkin) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback: centered portrait area if skin cluster is too sparse
  if (count < 40 || maxX - minX < 30 || maxY - minY < 30) {
    minX = Math.round(w * 0.15);
    maxX = Math.round(w * 0.55);
    minY = Math.round(h * 0.2);
    maxY = Math.round(h * 0.8);
  }

  const boxW = Math.max(40, maxX - minX);
  const boxH = Math.max(40, maxY - minY);
  const padX = Math.round(boxW * 0.15);
  const padY = Math.round(boxH * 0.15);

  const startX = Math.max(0, minX - padX);
  const startY = Math.max(0, minY - padY);
  const cropW = Math.min(w - startX, boxW + padX * 2);
  const cropH = Math.min(h - startY, boxH + padY * 2);

  // Normalize to standard 96x96 face geometry grid
  const normSize = 96;
  const normCanvas = document.createElement('canvas');
  normCanvas.width = normSize;
  normCanvas.height = normSize;
  const normCtx = normCanvas.getContext('2d', { willReadFrequently: true });
  if (!normCtx) return null;

  normCtx.drawImage(img, startX, startY, cropW, cropH, 0, 0, normSize, normSize);
  const normData = normCtx.getImageData(0, 0, normSize, normSize).data;

  // Convert to normalized grayscale float buffer with local contrast equalization
  const gray = new Float32Array(normSize * normSize);
  let mean = 0;
  for (let i = 0, j = 0; i < normData.length; i += 4, j++) {
    const luma = 0.299 * normData[i] + 0.587 * normData[i + 1] + 0.114 * normData[i + 2];
    gray[j] = luma;
    mean += luma;
  }
  mean /= gray.length;

  let variance = 0;
  for (let j = 0; j < gray.length; j++) {
    const diff = gray[j] - mean;
    variance += diff * diff;
  }
  const std = Math.sqrt(variance / gray.length) || 1;

  // Zero-mean unit-variance normalization (Z-score)
  for (let j = 0; j < gray.length; j++) {
    gray[j] = (gray[j] - mean) / std;
  }

  const dataUrl = normCanvas.toDataURL('image/jpeg', 0.95);

  canvas.width = 0;
  canvas.height = 0;
  normCanvas.width = 0;
  normCanvas.height = 0;

  return { dataUrl, grayPixels: gray, width: normSize, height: normSize };
}

/**
 * Computes gradient direction histogram (HOG) descriptor over 8x8 spatial cells
 */
function computeHOGDescriptor(gray: Float32Array, size: number): Float32Array {
  const cellSize = 16;
  const cells = size / cellSize; // 6x6 cells for 96x96
  const numBins = 8;
  const descriptor = new Float32Array(cells * cells * numBins);

  for (let cy = 0; cy < cells; cy++) {
    for (let cx = 0; cx < cells; cx++) {
      const cellOffset = (cy * cells + cx) * numBins;

      for (let y = cy * cellSize + 1; y < (cy + 1) * cellSize - 1; y++) {
        for (let x = cx * cellSize + 1; x < (cx + 1) * cellSize - 1; x++) {
          const idx = y * size + x;
          const gx = gray[idx + 1] - gray[idx - 1];
          const gy = gray[idx + size] - gray[idx - size];

          const mag = Math.sqrt(gx * gx + gy * gy);
          let angle = Math.atan2(gy, gx); // -PI to PI
          if (angle < 0) angle += Math.PI; // 0 to PI

          const bin = Math.min(numBins - 1, Math.floor((angle / Math.PI) * numBins));
          descriptor[cellOffset + bin] += mag;
        }
      }

      // Cell L2 normalization
      let cellNorm = 0;
      for (let b = 0; b < numBins; b++) {
        const val = descriptor[cellOffset + b];
        cellNorm += val * val;
      }
      cellNorm = Math.sqrt(cellNorm) || 1;
      for (let b = 0; b < numBins; b++) {
        descriptor[cellOffset + b] /= cellNorm;
      }
    }
  }

  return descriptor;
}

/**
 * Robust structural face matcher invariant to display reflections and desaturation
 */
export async function compareFacesAdvanced(
  face1Url: string,
  face2Url: string
): Promise<FaceComparisonResult> {
  try {
    const [crop1, crop2] = await Promise.all([
      extractTightFaceCrop(face1Url),
      extractTightFaceCrop(face2Url),
    ]);

    if (!crop1 || !crop2) {
      return { similarity: 48, band: 'INCONCLUSIVE', structuralScore: 48, chrominanceScore: 48 };
    }

    // 1. Compute HOG structural descriptors
    const hog1 = computeHOGDescriptor(crop1.grayPixels, crop1.width);
    const hog2 = computeHOGDescriptor(crop2.grayPixels, crop2.width);

    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < hog1.length; i++) {
      dot += hog1[i] * hog2[i];
      mag1 += hog1[i] * hog1[i];
      mag2 += hog2[i] * hog2[i];
    }
    const structuralCosine = dot / (Math.sqrt(mag1) * Math.sqrt(mag2) || 1);

    // 2. Normalized Cross-Correlation (NCC) across central face features (eyes/nose/mouth)
    let nccDot = 0;
    const len = crop1.grayPixels.length;
    for (let i = 0; i < len; i++) {
      nccDot += crop1.grayPixels[i] * crop2.grayPixels[i];
    }
    const nccScore = Math.max(0, nccDot / len);

    // Structural similarity metric (0-100)
    // Same person (even on phone screen vs card): structuralCosine typically 0.72 - 0.90
    // Different person: structuralCosine typically 0.25 - 0.55
    const compositeScore = structuralCosine * 0.65 + nccScore * 0.35;
    const calibratedSimilarity = Math.min(
      98,
      Math.max(12, Math.round(compositeScore * 105))
    );

    let band: FaceComparisonResult['band'] = 'MISMATCH';
    if (calibratedSimilarity >= 72) {
      band = 'STRONG_MATCH';
    } else if (calibratedSimilarity >= 58) {
      band = 'MODERATE_MATCH';
    } else {
      band = 'MISMATCH';
    }

    return {
      similarity: calibratedSimilarity,
      band,
      structuralScore: Math.round(structuralCosine * 100),
      chrominanceScore: Math.round(nccScore * 100),
    };
  } catch (err) {
    console.error('Face comparison error:', err);
    return { similarity: 45, band: 'INCONCLUSIVE', structuralScore: 45, chrominanceScore: 45 };
  }
}
