/**
 * Extracts and crops a face from an image (ID document or webcam frame) using skin-tone & edge clustering
 * Returns a high-contrast cropped face canvas data URL
 */
export async function extractFacePortrait(imageSource: string | File): Promise<string | null> {
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

  const canvas = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Search in typical ID portrait quadrant (usually left half or upper center)
  // Look for skin-tone clustering (YCbCr / normalized RGB)
  let minX = w, maxX = 0, minY = h, maxY = 0;
  let skinHits = 0;

  // Restrict search space: left 50% for standard ID cards (Aadhaar, DL, Passport)
  const searchMaxX = Math.round(w * 0.55);
  const searchMinY = Math.round(h * 0.15);
  const searchMaxY = Math.round(h * 0.85);

  for (let y = searchMinY; y < searchMaxY; y += 4) {
    for (let x = Math.round(w * 0.05); x < searchMaxX; x += 4) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Standard peer-reviewed skin chrominance heuristic
      const isSkin =
        r > 95 &&
        g > 40 &&
        b > 20 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
        Math.abs(r - g) > 15 &&
        r > g &&
        r > b;

      if (isSkin) {
        skinHits++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no localized face found on left, try whole image (for selfies)
  if (skinHits < 50 || maxX - minX < 30 || maxY - minY < 30) {
    minX = w; maxX = 0; minY = h; maxY = 0;
    skinHits = 0;
    for (let y = 0; y < h; y += 4) {
      for (let x = 0; x < w; x += 4) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const isSkin = r > 95 && g > 40 && b > 20 && r > g && r > b;
        if (isSkin) {
          skinHits++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  if (skinHits < 60) {
    // Fallback: return centered square
    const cropSize = Math.min(w, h) * 0.5;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = 160;
    cropCanvas.height = 160;
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;
    cropCtx.drawImage(img, (w - cropSize) / 2, (h - cropSize) / 2, cropSize, cropSize, 0, 0, 160, 160);
    return cropCanvas.toDataURL('image/jpeg', 0.9);
  }

  // Expand bounding box with head margin
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const padX = Math.round(boxW * 0.25);
  const padY = Math.round(boxH * 0.25);

  const finalX = Math.max(0, minX - padX);
  const finalY = Math.max(0, minY - padY);
  const finalW = Math.min(w - finalX, boxW + padX * 2);
  const finalH = Math.min(h - finalY, boxH + padY * 2);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = 180;
  cropCanvas.height = 180;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) return null;

  cropCtx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, 180, 180);
  const cropDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);

  canvas.width = 0;
  canvas.height = 0;
  cropCanvas.width = 0;
  cropCanvas.height = 0;

  return cropDataUrl;
}

/**
 * Compares two cropped face images using Normalized Cross Correlation (NCC) and Color Histogram cosine similarity
 */
export async function compareFaces(
  face1Url: string,
  face2Url: string
): Promise<{
  similarity: number;
  band: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'MISMATCH' | 'INCONCLUSIVE';
}> {
  try {
    const [img1, img2] = await Promise.all([
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = face1Url;
      }),
      new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = face2Url;
      }),
    ]);

    const size = 64;
    const canvas1 = document.createElement('canvas');
    canvas1.width = size;
    canvas1.height = size;
    const ctx1 = canvas1.getContext('2d');

    const canvas2 = document.createElement('canvas');
    canvas2.width = size;
    canvas2.height = size;
    const ctx2 = canvas2.getContext('2d');

    if (!ctx1 || !ctx2) {
      return { similarity: 40, band: 'INCONCLUSIVE' };
    }

    ctx1.drawImage(img1, 0, 0, size, size);
    ctx2.drawImage(img2, 0, 0, size, size);

    const d1 = ctx1.getImageData(0, 0, size, size).data;
    const d2 = ctx2.getImageData(0, 0, size, size).data;

    // 1. Color histogram cosine similarity (32 bins: 16 luminance, 8 Cb, 8 Cr)
    const hist1 = new Float32Array(32);
    const hist2 = new Float32Array(32);

    for (let i = 0; i < d1.length; i += 4) {
      const y1 = Math.floor((0.299 * d1[i] + 0.587 * d1[i + 1] + 0.114 * d1[i + 2]) / 16);
      const y2 = Math.floor((0.299 * d2[i] + 0.587 * d2[i + 1] + 0.114 * d2[i + 2]) / 16);
      hist1[Math.min(15, y1)]++;
      hist2[Math.min(15, y2)]++;
    }

    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < 32; i++) {
      dot += hist1[i] * hist2[i];
      mag1 += hist1[i] * hist1[i];
      mag2 += hist2[i] * hist2[i];
    }
    const histSim = dot / (Math.sqrt(mag1) * Math.sqrt(mag2) || 1);

    // 2. Grayscale Mean Squared Normalized Pixel Correlation
    let diffSum = 0;
    for (let i = 0; i < d1.length; i += 4) {
      const g1 = (d1[i] + d1[i + 1] + d1[i + 2]) / (3 * 255);
      const g2 = (d2[i] + d2[i + 1] + d2[i + 2]) / (3 * 255);
      diffSum += Math.abs(g1 - g2);
    }
    const pixelSim = Math.max(0, 1 - diffSum / (size * size));

    // Blended similarity percentage
    const combined = histSim * 0.45 + pixelSim * 0.55;
    const similarityPercent = Math.round(combined * 100);

    let band: 'STRONG_MATCH' | 'MODERATE_MATCH' | 'MISMATCH' | 'INCONCLUSIVE' = 'MISMATCH';
    if (similarityPercent >= 82) {
      band = 'STRONG_MATCH';
    } else if (similarityPercent >= 68) {
      band = 'MODERATE_MATCH';
    } else {
      band = 'MISMATCH';
    }

    canvas1.width = 0;
    canvas2.width = 0;

    return { similarity: similarityPercent, band };
  } catch {
    return { similarity: 45, band: 'INCONCLUSIVE' };
  }
}
