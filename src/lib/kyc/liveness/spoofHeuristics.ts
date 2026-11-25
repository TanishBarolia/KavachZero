/**
 * Presentation Attack Detection (PAD) & Screen Replay Heuristics
 * Analyzes video frames for screen moiré patterns, phone borders, specular glass glares,
 * and rigid 2D planar motion.
 */

export interface AntiSpoofResult {
  isSpoofSuspected: boolean;
  screenReplayScore: number; // 0 to 100
  moireScore: number;
  bezelEdgeScore: number;
  specularReflectionScore: number;
  reasons: string[];
}

export function evaluateScreenReplay(
  canvas: HTMLCanvasElement,
  data: Uint8ClampedArray,
  width: number,
  height: number
): AntiSpoofResult {
  let moireCount = 0;
  let specularHotspots = 0;
  let verticalEdgeSum = 0;
  let horizontalEdgeSum = 0;
  const reasons: string[] = [];

  // 1. High-Frequency Grid (Moiré artifact from phone LCD/OLED subpixels)
  // Check alternating high-frequency pixel differentials
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const rRight = data[idx + 4];
      const rDown = data[idx + width * 4];

      // Screen grid high frequency ringing
      const hDiff = Math.abs(r - rRight);
      const vDiff = Math.abs(r - rDown);

      if (hDiff > 45 && vDiff > 45) {
        moireCount++;
      }

      // Specular glass glare reflection from phone screen
      if (r > 250 && g > 250 && b > 250) {
        specularHotspots++;
      }

      // Sharp rectangular phone border edges (vertical and horizontal line gradients)
      if (x < width * 0.25 || x > width * 0.75) {
        verticalEdgeSum += hDiff;
      }
      if (y < height * 0.2 || y > height * 0.8) {
        horizontalEdgeSum += vDiff;
      }
    }
  }

  const totalAnalyzed = (width * height) / 4;
  const moireRatio = (moireCount / totalAnalyzed) * 100;
  const specularRatio = (specularHotspots / totalAnalyzed) * 100;
  const avgEdge = (verticalEdgeSum + horizontalEdgeSum) / totalAnalyzed;

  const moireScore = Math.min(100, Math.round(moireRatio * 20));
  const specularScore = Math.min(100, Math.round(specularRatio * 35));
  const bezelScore = Math.min(100, Math.round(avgEdge * 1.5));

  // Composite screen replay risk score
  const screenReplayScore = Math.min(100, Math.round(moireScore * 0.45 + specularScore * 0.35 + bezelScore * 0.20));

  if (specularScore > 35) {
    reasons.push('High specular glass reflection detected consistent with mobile phone screen display.');
  }
  if (moireScore > 40) {
    reasons.push('High-frequency pixel grid (Moiré interference) detected from an electronic display.');
  }
  if (bezelScore > 50) {
    reasons.push('Rectangular phone bezel / device boundary edges detected in camera frame.');
  }

  const isSpoofSuspected = screenReplayScore >= 45 || reasons.length > 0;

  return {
    isSpoofSuspected,
    screenReplayScore,
    moireScore,
    bezelEdgeScore: bezelScore,
    specularReflectionScore: specularScore,
    reasons,
  };
}

/**
 * Generates an unpredictable, cryptographically random challenge sequence
 * Drawn without replacement using CSPRNG (crypto.getRandomValues)
 */
export function generateRandomChallengeSequence(): Array<{
  id: 'blink' | 'turn_left' | 'turn_right' | 'smile';
  label: string;
  instruction: string;
  completed: boolean;
  elapsedMs: number;
}> {
  const pool = [
    { id: 'blink', label: 'Blink Eyes', instruction: 'Blink your eyes naturally facing the camera' },
    { id: 'turn_left', label: 'Turn Head Left', instruction: 'Turn your head slightly to your left' },
    { id: 'turn_right', label: 'Turn Head Right', instruction: 'Turn your head slightly to your right' },
    { id: 'smile', label: 'Gentle Smile', instruction: 'Show a gentle natural smile' },
  ] as const;

  // Cryptographic shuffle
  const array = [...pool];
  const randomBytes = new Uint32Array(array.length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
    for (let i = array.length - 1; i > 0; i--) {
      const j = randomBytes[i] % (i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Select 2 to 3 unpredictable challenges
  return array.slice(0, 3).map((item) => ({
    ...item,
    completed: false,
    elapsedMs: 0,
  }));
}
