/**
 * VerisVisuals — Scroll Controller
 * ===================================
 * Normalizes wheel and trackpad input into a damped 0–1 value.
 * The 0–1 range maps across all timeline sections.
 * Uses lerp-based damping so the value never jumps.
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

export class ScrollController {
  private readonly container: HTMLElement;
  private readonly eventBus: EventBus;

  /** Undamped target value (what the user is scrolling toward). */
  private target = 0;

  /** Damped (smoothed) current value. */
  private current = 0;

  /** Previous target for delta calculation. */
  private prevTarget = 0;

  private bound = false;

  constructor(container: HTMLElement, eventBus: EventBus) {
    this.container = container;
    this.eventBus = eventBus;
  }

  /** Bind wheel event listener to the window/document. */
  init(): void {
    if (this.bound) return;
    window.addEventListener('wheel', this.handleWheel, { passive: false });
    this.bound = true;
  }

  /**
   * Call from the animation loop. Damps `current` toward `target`.
   * @returns The current damped scroll value in [0, 1].
   */
  update(): number {
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

  /** Remove event listener and reset state. */
  dispose(): void {
    if (this.bound) {
      window.removeEventListener('wheel', this.handleWheel);
      this.bound = false;
    }
    this.target = 0;
    this.current = 0;
    this.prevTarget = 0;
  }

  /* ─── Private Handlers ────────────────────────────────────────────────────── */

  /**
   * Named handler for wheel events.
   * Normalizes both discrete mouse wheel and continuous trackpad input.
   */
  private handleWheel = (e: WheelEvent): void => {
    // Prevent default page scroll — we drive the experience
    e.preventDefault();

    // Use deltaY for scroll direction, with mode detection for normalization.
    // Trackpad: many tiny events with small deltaY.
    // Mouse wheel: fewer events with large deltaY.
    // We accumulate into the target and clamp.
    let delta = e.deltaY;

    // Normalize: trackpad pixels vs mouse wheel lines (mode 1)
    if (e.deltaMode === 1) {
      // Line mode — mouse wheel typically sends 40–120 per click
      delta *= 40;
    } else if (e.deltaMode === 2) {
      // Page mode
      delta *= 800;
    }

    // Filter out sub-pixel noise
    if (Math.abs(delta) < DEAD_ZONE) return;

    // Convert pixel delta to 0–1 range
    const normalizedDelta = delta / VIRTUAL_SCROLL_RANGE;
    this.target = clamp01(this.target + normalizedDelta);
  };
}