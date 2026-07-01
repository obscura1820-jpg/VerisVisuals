/**
 * VerisVisuals — Scroll Controller
 * ===================================
 * Normalizes wheel, trackpad, and touch input into a damped 0–1 value.
 * The 0–1 range maps across all timeline sections.
 * Uses lerp-based damping so the value never jumps.
 *
 * Touch support:
 * - Single-finger swipe for virtual scrolling (section navigation)
 * - Momentum / inertia after lift for natural feel
 * - Gallery-aware: lets the archive gallery scroll internally when possible,
 *   and only hijacks for section navigation when the gallery hits a boundary.
 *
 * @module scroll
 */

import { EventBus, VerisEvent } from './event-bus';
import { SCROLL } from './config';
import { clamp01, lerp } from './utils';

/** Approximate document height in virtual scroll units for 0–1 mapping. */
const VIRTUAL_SCROLL_RANGE = 5000;

/** Minimum delta magnitude to register a scroll event (filters noise). */
const DEAD_ZONE = 1;

/** Sensitivity multiplier for touch vs wheel (mobile swipes are shorter). */
const TOUCH_SENSITIVITY = 6;

/** How quickly touch momentum decays per frame (0–1). */
const MOMENTUM_DECAY = 0.93;

/** Minimum momentum velocity to keep animating. */
const MOMENTUM_MIN_VELOCITY = 0.00005;

/** CSS selector for the gallery overlay that has its own internal scroll. */
const GALLERY_SELECTOR = '.veris-phase-overlay--gallery';

/** Number of recent (Y, time) samples for velocity calculation. */
const VELOCITY_SAMPLE_SIZE = 5;

interface VelocitySample {
  y: number;
  time: number;
}

export class ScrollController {
  private readonly container: HTMLElement;
  private readonly eventBus: EventBus;

  /** When false, all input (wheel + touch) is ignored. */
  private enabled = false;

  /** Undamped target value (what the user is scrolling toward). */
  private target = 0;

  /** Damped (smoothed) current value. */
  private current = 0;

  /** Previous target for delta calculation. */
  private prevTarget = 0;

  private bound = false;

  /* ─── Touch State ───────────────────────────────────────────────────────────── */

  /** Whether a single-finger touch is currently active. */
  private touchActive = false;

  /** Y position of the last touchmove. */
  private touchLastY = 0;

  /** Ring buffer of recent (Y, time) samples for velocity on touchend. */
  private velocitySamples: VelocitySample[] = [];

  /** Current momentum velocity (0–1 units per frame). Applied in update(). */
  private momentumVelocity = 0;

  /** Whether we are currently applying momentum. */
  private momentumActive = false;

  /** If true, the last touch was handled by the gallery internally — suppress momentum. */
  private lastTouchWasGalleryInternal = false;

  constructor(container: HTMLElement, eventBus: EventBus) {
    this.container = container;
    this.eventBus = eventBus;
  }

  /** Bind wheel + touch event listeners. */
  init(): void {
    if (this.bound) return;
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
    this.bound = true;
  }

  /**
   * Call from the animation loop. Damps `current` toward `target`,
   * and also applies any active touch momentum.
   * @returns The current damped scroll value in [0, 1].
   */
  update(): number {
    // Apply momentum (from touch end) — adds to target each frame
    if (this.momentumActive) {
      if (Math.abs(this.momentumVelocity) < MOMENTUM_MIN_VELOCITY) {
        this.momentumVelocity = 0;
        this.momentumActive = false;
      } else {
        this.target = clamp01(this.target + this.momentumVelocity);
        this.momentumVelocity *= MOMENTUM_DECAY;
      }
    }

    // Lerp toward target — never directly set current to target
    const damping = SCROLL.damping;
    this.current = lerp(this.current, this.target, damping);

    // Clamp after lerp
    this.current = clamp01(this.current);

    // Emit if there was meaningful movement
    const delta = Math.abs(this.current - this.prevTarget);
    if (delta > 0.0001) {
      this.eventBus.emit(VerisEvent.ScrollUpdate, { value: this.current });
    }

    this.prevTarget = this.current;
    return this.current;
  }

  /** Get the current damped scroll value without updating. */
  getValue(): number {
    return this.current;
  }

  /** Enable scroll input. Called after the preloader has fully faded. */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Reset scroll state — called when transitioning out of PRELOADER
   * to ensure no stale touch/wheel deltas carry over.
   */
  reset(): void {
    this.target = 0;
    this.current = 0;
    this.prevTarget = 0;
    this.cancelMomentum();
  }

  /** Remove all event listeners and reset state. */
  dispose(): void {
    if (this.bound) {
      window.removeEventListener('wheel', this.handleWheel);
      window.removeEventListener('touchstart', this.handleTouchStart);
      window.removeEventListener('touchmove', this.handleTouchMove);
      window.removeEventListener('touchend', this.handleTouchEnd);
      window.removeEventListener('touchcancel', this.handleTouchEnd);
      this.bound = false;
    }
    this.target = 0;
    this.current = 0;
    this.prevTarget = 0;
    this.cancelMomentum();
  }

  /* ─── Wheel Handler ─────────────────────────────────────────────────────────── */

  /**
   * Named handler for wheel events.
   * Normalizes both discrete mouse wheel and continuous trackpad input.
   */
  private handleWheel = (e: WheelEvent): void => {
    if (!this.enabled) return;

    // Prevent default page scroll — we drive the experience
    e.preventDefault();

    // Cancel any active touch momentum
    this.cancelMomentum();

    let delta = e.deltaY;

    // Normalize: trackpad pixels vs mouse wheel lines (mode 1)
    if (e.deltaMode === 1) {
      delta *= 40;
    } else if (e.deltaMode === 2) {
      delta *= 800;
    }

    // Filter out sub-pixel noise
    if (Math.abs(delta) < DEAD_ZONE) return;

    // Convert pixel delta to 0–1 range
    const normalizedDelta = delta / VIRTUAL_SCROLL_RANGE;
    this.target = clamp01(this.target + normalizedDelta);
  };

  /* ─── Touch Handlers ────────────────────────────────────────────────────────── */

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.enabled) return;

    // Ignore multi-touch (pinch/zoom)
    if (e.touches.length > 1) {
      this.touchActive = false;
      this.cancelMomentum();
      return;
    }

    this.touchActive = true;
    this.touchLastY = e.touches[0].clientY;
    this.cancelMomentum();
    this.lastTouchWasGalleryInternal = false;

    // Reset velocity samples
    this.velocitySamples = [];
    this.pushVelocitySample(this.touchLastY);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.enabled) return;
    if (!this.touchActive || e.touches.length > 1) return;

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = this.touchLastY - currentY; // positive = scroll down (finger moves up)
    this.touchLastY = currentY;

    // Record sample for velocity calculation
    this.pushVelocitySample(currentY);

    // Filter sub-pixel noise
    if (Math.abs(deltaY) < DEAD_ZONE) return;

    // Check if touch is inside a scrollable gallery overlay
    const target = e.target as HTMLElement;
    const gallery = target.closest(GALLERY_SELECTOR) as HTMLElement | null;

    if (gallery) {
      const scrollingDown = deltaY > 0;
      const scrollingUp = deltaY < 0;

      const atTop = gallery.scrollTop <= 1;
      const atBottom = gallery.scrollTop + gallery.clientHeight >= gallery.scrollHeight - 1;

      // If the gallery can still scroll in the swipe direction, let it handle it natively
      if ((scrollingDown && !atBottom) || (scrollingUp && !atTop)) {
        this.lastTouchWasGalleryInternal = true;
        return; // Don't prevent default — let the gallery's overflow-y: auto handle it
      }

      // Gallery is at its boundary — hijack for virtual section scrolling
      this.lastTouchWasGalleryInternal = false;
      e.preventDefault();
      const normalizedDelta = (deltaY * TOUCH_SENSITIVITY) / VIRTUAL_SCROLL_RANGE;
      this.target = clamp01(this.target + normalizedDelta);
    } else {
      // Not inside a scrollable gallery — always use for virtual scroll
      e.preventDefault();
      const normalizedDelta = (deltaY * TOUCH_SENSITIVITY) / VIRTUAL_SCROLL_RANGE;
      this.target = clamp01(this.target + normalizedDelta);
    }
  };

  private handleTouchEnd = (): void => {
    if (!this.enabled) return;
    if (!this.touchActive) return;
    this.touchActive = false;

    // If the touch was entirely gallery-internal, don't apply momentum
    if (this.lastTouchWasGalleryInternal) {
      this.lastTouchWasGalleryInternal = false;
      return;
    }

    // Calculate momentum from recent velocity samples
    const velocity = this.calculateVelocity();
    if (velocity !== 0) {
      // Convert velocity (px/s) to 0–1 units per frame (assuming ~60fps = 16.67ms)
      this.momentumVelocity = (velocity * TOUCH_SENSITIVITY) / VIRTUAL_SCROLL_RANGE * (16.67 / 1000);
      this.momentumActive = true;
    }
  };

  /* ─── Velocity Helpers ──────────────────────────────────────────────────────── */

  /** Push a (Y, time) sample into the ring buffer. */
  private pushVelocitySample(y: number): void {
    this.velocitySamples.push({ y, time: performance.now() });
    if (this.velocitySamples.length > VELOCITY_SAMPLE_SIZE) {
      this.velocitySamples.shift();
    }
  }

  /**
   * Calculate average velocity from recent samples.
   * @returns Velocity in pixels per second (positive = scrolling down).
   */
  private calculateVelocity(): number {
    const samples = this.velocitySamples;
    if (samples.length < 2) return 0;

    // Use the most recent pair for the most responsive feel
    const recent = samples[samples.length - 1];
    // Look back a few samples for a more stable velocity estimate
    const lookback = Math.max(0, samples.length - 3);
    const older = samples[lookback];

    const dt = (recent.time - older.time) / 1000; // seconds
    if (dt <= 0) return 0;

    // Negative because touch Y decreases as user scrolls down
    const dy = older.y - recent.y;

    return dy / dt; // px/s
  }

  /** Cancel any active momentum animation. */
  private cancelMomentum(): void {
    this.momentumVelocity = 0;
    this.momentumActive = false;
  }
}