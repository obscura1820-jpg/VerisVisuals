/**
 * VerisVisuals — Utility Functions
 * ===================================
 * Pure helper functions used across modules.
 * No side effects. No class instances.
 *
 * @module utils
 */

/**
 * Linearly interpolate between `a` and `b` by factor `t` (0→a, 1→b).
 * Clamped so `t` outside [0,1] snaps to the nearest endpoint.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/** Clamp a value to [0, 1]. */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Clamp a value to [min, max]. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Convert a hex number (0xRRGGBB) to a normalized `{r, g, b}` in [0,1]. */
export function hexToRgb01(hex: number): { r: number; g: number; b: number } {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
  };
}

/** Convert an sRGB component [0,255] to linear [0,1] for color math. */
export function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Map a value from [inMin, inMax] to [outMin, outMax]. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Critically-damped spring step.
 * Used for mouse parallax and camera transitions.
 * `factor` should be ~0.06 for smooth following.
 */
export function criticallyDampedStep(
  current: number,
  target: number,
  factor: number,
): number {
  return current + (target - current) * factor;
}

/**
 * EaseInOutQuart — the PRD-specified easing for accelerations.
 * `t` in [0,1].
 */
export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

/** Return current time in seconds with high precision. */
export function now(): number {
  return performance.now() / 1000;
}

/**
 * Debounce a function by `ms` milliseconds.
 * Returns a new function that delays invocation.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/**
 * Throttle a function to run at most once per `ms` milliseconds.
 * Returns a new function.
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const elapsed = performance.now() - last;
    if (elapsed >= ms) {
      last = performance.now();
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        last = performance.now();
        timer = null;
        fn(...args);
      }, ms - elapsed);
    }
  };
}