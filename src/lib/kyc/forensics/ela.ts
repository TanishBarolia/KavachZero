import { KYC_CONFIG } from '../config';
import { ElaFinding } from '../types';

/**
 * Performs Error Level Analysis (ELA) on an image file or bitmap.
 * Re-compresses the image at fixed quality, amplifies difference, and detects block-level compression anomalies.
 */
export async function performElaAnalysis(file: File): Promise<{
  finding: ElaFinding;
  elaDataUrl: string;
}> {
  const isJpeg = file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');

  const bitmap = await createImageBitmap(file);
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // Canvas 1: Original resized image
  const origCanvas = document.createElement('canvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d', { willReadFrequently: true });
  if (!origCtx) throw new Error('Could not get 2D canvas context');
  origCtx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const origData = origCtx.getImageData(0, 0, w, h);

  // Re-encode at fixed quality (90%)
  const recompressedDataUrl = origCanvas.toDataURL('image/jpeg', KYC_CONFIG.ELA_JPEG_QUALITY);
  const recompressedImg = new Image();
  await new Promise<void>((resolve, reject) => {
    recompressedImg.onload = () => resolve();
    recompressedImg.onerror = reject;
    recompressedImg.src = recompressedDataUrl;
  });

  // Canvas 2: Recompressed image
  const recompCanvas = document.createElement('canvas');
  recompCanvas.width = w;
  recompCanvas.height = h;
  const recompCtx = recompCanvas.getContext('2d', { willReadFrequently: true });
  if (!recompCtx) throw new Error('Could not get recomp context');
  recompCtx.drawImage(recompressedImg, 0, 0, w, h);

  const recompData = recompCtx.getImageData(0, 0, w, h);

  // Canvas 3: ELA amplified differential visualization
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = w;
  diffCanvas.height = h;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) throw new Error('Could not get diff context');
  const diffImgData = diffCtx.createImageData(w, h);

  const origPixels = origData.data;
  const recompPixels = recompData.data;
  const diffPixels = diffImgData.data;

  const amp = KYC_CONFIG.ELA_DIFF_AMPLIFIER;
  const blockSize = 16;
  const blocksX = Math.floor(w / blockSize);
  const blocksY = Math.floor(h / blockSize);
  const totalBlocks = Math.max(1, blocksX * blocksY);

  const blockErrors: number[] = new Array(totalBlocks).fill(0);
  let totalDiffSum = 0;

  for (let y = 0; y < h; y++) {
    const by = Math.min(blocksY - 1, Math.floor(y / blockSize));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(blocksX - 1, Math.floor(x / blockSize));
      const bIdx = by * blocksX + bx;

      const idx = (y * w + x) * 4;
      const dr = Math.abs(origPixels[idx] - recompPixels[idx]);
      const dg = Math.abs(origPixels[idx + 1] - recompPixels[idx + 1]);
      const db = Math.abs(origPixels[idx + 2] - recompPixels[idx + 2]);

      const pixelDiff = (dr + dg + db) / 3;
      totalDiffSum += pixelDiff;
      blockErrors[bIdx] += pixelDiff;

      // Colorize ELA: high error shown in bright magenta/cyan
      diffPixels[idx] = Math.min(255, dr * amp);
      diffPixels[idx + 1] = Math.min(255, dg * amp);
      diffPixels[idx + 2] = Math.min(255, db * amp);
      diffPixels[idx + 3] = 255;
    }
  }

  diffCtx.putImageData(diffImgData, 0, 0);
  const elaDataUrl = diffCanvas.toDataURL('image/png');

  // Compute block variance & statistical outliers
  const meanBlockError = totalDiffSum / totalBlocks;
  let varianceBlockError = 0;
  for (let i = 0; i < totalBlocks; i++) {
    const d = blockErrors[i] - meanBlockError;
    varianceBlockError += d * d;
  }
  const stdDev = Math.sqrt(varianceBlockError / totalBlocks);

  // Identify high anomaly regions (outliers > 2.5 standard deviations)
  let anomalousBlocks = 0;
  const suspiciousRegions: Array<{ x: number; y: number; width: number; height: number; score: number }> = [];

  for (let by = 0; by < blocksY; by++) {
    for (let bx = 0; bx < blocksX; bx++) {
      const idx = by * blocksX + bx;
      const err = blockErrors[idx];
      if (err > meanBlockError + 2.4 * stdDev && err > 20) {
        anomalousBlocks++;
        if (suspiciousRegions.length < 5) {
          suspiciousRegions.push({
            x: Math.round((bx * blockSize) / w * 100),
            y: Math.round((by * blockSize) / h * 100),
            width: Math.round((blockSize / w) * 100),
            height: Math.round((blockSize / h) * 100),
            score: Number(((err - meanBlockError) / Math.max(1, stdDev)).toFixed(2)),
          });
        }
      }
    }
  }

  const anomalyRatio = anomalousBlocks / totalBlocks;
  const isManipulated = isJpeg && anomalyRatio > KYC_CONFIG.ELA_ANOMALY_RATIO_TRIGGER;

  let caveat = 'ELA highlights regional compression differences; re-saved scans or natural high-contrast edges can produce legitimate error peaks.';
  if (!isJpeg) {
    caveat = 'Source is not a baseline JPEG. ELA results are heuristic/inconclusive for PNG/WebP files.';
  }

  // Dereference canvases
  origCanvas.width = 0;
  recompCanvas.width = 0;
  diffCanvas.width = 0;

  return {
    finding: {
      anomalyScore: Number(Math.min(1, anomalyRatio * 3.5).toFixed(2)),
      isManipulated,
      highVarianceBlocks: anomalousBlocks,
      totalBlocks,
      suspiciousRegions,
      caveat,
    },
    elaDataUrl,
  };
}
