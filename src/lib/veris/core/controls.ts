/**
 * VerisVisuals — Mouse Controller
 * =================================
 * Tracks pointer position, velocity, and hover state on the container element.
 * Normalized coordinates (-1 to 1) for direct use with camera parallax.
 * Respects `prefers-reduced-motion` — zeros out velocity when active.
 *
 * @module controls
 */

import { EventBus, VerisEvent } from './event-bus';
import { clamp } from './utils';

/** Current mouse/pointer state snapshot. */
export interface MouseState {
  /** Normalized X position (-1 = left, 1 = right). */
  x: number;
  /** Normalized Y position (-1 = bottom, 1 = top). */
  y: number;
  /** Smoothed velocity in X (change per frame). */
  velocityX: number;
  /** Smoothed velocity in Y (change per frame). */
  velocityY: number;
  /** Whether the pointer is currently moving above a threshold. */
  isMoving: boolean;
}

/** Velocity smoothing factor — lower = smoother. */
const VELOCITY_LERP = 0.15;

/** Frames below this velocity threshold before `isMoving` flips to false. */
const MOVE_THRESHOLD = 0.0004;

/** Frames to wait before declaring hover ended (debounce). */
const HOVER_END_DELAY_MS = 150;

export class MouseController {
  private readonly container: HTMLElement;
  private readonly eventBus: EventBus;
  private readonly prefersReducedMotion: boolean;

  /** Raw (unscaled) pointer position in container-local pixels. */
  private rawX = 0;
  private rawY = 0;
  private prevRawX = 0;
  private prevRawY = 0;

  /** Current smoothed state. */
  private state: MouseState = {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    isMoving: false,
  };

  /** Hover tracking. */
  private hoverMovingFrames = 0;
  private hoverEndTimer: ReturnType<typeof setTimeout> | null = null;
  private isHovering = false;

  private bound = false;

  constructor(container: HTMLElement, eventBus: EventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }

  /** Bind pointer event listeners to the container. */
  init(): void {
    if (this.bound) return;
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.bound = true;
  }

  /**
   * Call every frame from the animation loop.
   * Updates velocity and hover state, then returns the current state snapshot.
   */
  update(): MouseState {
    const containerW = this.container.clientWidth || 1;
    const containerH = this.container.clientHeight || 1;

    // Normalize raw position to -1..1
    const targetX = clamp(((this.rawX / containerW) * 2 - 1), -1, 1);
    const targetY = clamp(-((this.rawY / containerH) * 2 - 1), -1, 1);

    // Smooth position (lerp)
    this.state.x += (targetX - this.state.x) * 0.1;
    this.state.y += (targetY - this.state.y) * 0.1;

    // Velocity from raw delta
    const rawDx = this.rawX - this.prevRawX;
    const rawDy = this.rawY - this.prevRawY;
    this.prevRawX = this.rawX;
    this.prevRawY = this.rawY;

    if (this.prefersReducedMotion) {
      this.state.velocityX = 0;
      this.state.velocityY = 0;
      this.state.isMoving = false;
      return { ...this.state };
    }

    // Normalize velocity to -1..1 range (heuristic divisor)
    const normDx = rawDx / containerW * 2;
    const normDy = rawDy / containerH * 2;

    // Smooth velocity
    this.state.velocityX += (normDx - this.state.velocityX) * VELOCITY_LERP;
    this.state.velocityY += (normDy - this.state.velocityY) * VELOCITY_LERP;

    // Movement detection
    const speed = Math.abs(this.state.velocityX) + Math.abs(this.state.velocityY);
    if (speed > MOVE_THRESHOLD) {
      this.hoverMovingFrames++;
      if (this.hoverMovingFrames > 2 && !this.isHovering) {
        this.isHovering = true;
        this.eventBus.emit(VerisEvent.HoverStart);
      }
      // Reset hover-end timer
      if (this.hoverEndTimer !== null) {
        clearTimeout(this.hoverEndTimer);
        this.hoverEndTimer = null;
      }
    } else {
      this.hoverMovingFrames = 0;
      if (this.isHovering && this.hoverEndTimer === null) {
        this.hoverEndTimer = setTimeout(() => {
          this.hoverEndTimer = null;
          this.isHovering = false;
          this.eventBus.emit(VerisEvent.HoverEnd);
        }, HOVER_END_DELAY_MS);
      }
    }

    this.state.isMoving = this.isHovering;
    return { ...this.state };
  }

  /** Get the current mouse state without updating. */
  getState(): MouseState {
    return { ...this.state };
  }

  /** Remove event listeners and timers. */
  dispose(): void {
    if (this.bound) {
      this.container.removeEventListener('pointermove', this.handlePointerMove);
      this.bound = false;
    }
    if (this.hoverEndTimer !== null) {
      clearTimeout(this.hoverEndTimer);
      this.hoverEndTimer = null;
    }
    this.state = { x: 0, y: 0, velocityX: 0, velocityY: 0, isMoving: false };
    this.isHovering = false;
    this.hoverMovingFrames = 0;
  }

  /* ─── Private Handlers ────────────────────────────────────────────────────── */

  /** Named handler for pointer move events. */
  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.container.getBoundingClientRect();
    this.rawX = e.clientX - rect.left;
    this.rawY = e.clientY - rect.top;
  };
}