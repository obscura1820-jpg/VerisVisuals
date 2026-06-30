/**
 * VerisVisuals — Timeline Manager
 * ===================================
 * Finite state machine that controls the experience sections.
 * Order: PRELOADER → HERO → ARCHIVE → DETAIL → CONTACT
 * Scroll progress (0–1) maps to progress within the current section.
 * Transitions between sections are animated via GSAP.
 *
 * @module timeline
 */

import gsap from 'gsap';
import { EventBus, VerisEvent } from './event-bus';

/** Timeline section states. */
export enum TimelineState {
  PRELOADER = 'PRELOADER',
  HERO = 'HERO',
  ARCHIVE = 'ARCHIVE',
  DETAIL = 'DETAIL',
  CONTACT = 'CONTACT',
}

/** Canonical order of states. */
const STATE_ORDER: TimelineState[] = [
  TimelineState.PRELOADER,
  TimelineState.HERO,
  TimelineState.ARCHIVE,
  TimelineState.DETAIL,
  TimelineState.CONTACT,
];

/** GSAP transition duration in seconds. */
const TRANSITION_DURATION = 1.2;

export class TimelineManager {
  private readonly eventBus: EventBus;

  /** Current active state. */
  private currentState: TimelineState = TimelineState.PRELOADER;

  /** Internal progress value, animated by GSAP for smooth transitions. */
  private progressValue = { value: 0 };

  /** Whether a GSAP transition is currently running. */
  private transitioning = false;

  /** Unsubscribe handle for scroll events. */
  private unsubScroll: (() => void) | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Initialize the timeline and subscribe to scroll updates. */
  init(): void {
    this.unsubScroll = this.eventBus.on(VerisEvent.ScrollUpdate, (payload: unknown) => {
      const { value } = payload as { value: number };
      this.setProgress(value);
    });
  }

  /**
   * Transition to a specific state.
   * Emits `SectionChanged` with `{ from, to }`.
   * No-op if already in the target state.
   */
  goto(state: TimelineState): void {
    if (state === this.currentState || this.transitioning) return;

    const from = this.currentState;
    const to = state;

    this.transitioning = true;

    // Reset progress for the new state
    gsap.to(this.progressValue, {
      value: 0,
      duration: TRANSITION_DURATION * 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        this.currentState = to;
        this.progressValue.value = 0;
        this.eventBus.emit(VerisEvent.SectionChanged, { from, to });
        this.transitioning = false;
      },
    });
  }

  /** Advance to the next state in sequence. */
  next(): void {
    const idx = STATE_ORDER.indexOf(this.currentState);
    if (idx < STATE_ORDER.length - 1) {
      this.goto(STATE_ORDER[idx + 1]);
    }
  }

  /** Go back to the previous state in sequence. */
  previous(): void {
    const idx = STATE_ORDER.indexOf(this.currentState);
    if (idx > 0) {
      this.goto(STATE_ORDER[idx - 1]);
    }
  }

  /** Get the current active state. */
  getCurrentState(): TimelineState {
    return this.currentState;
  }

  /** Get the current progress within the active state (0–1). */
  getProgress(): number {
    return this.progressValue.value;
  }

  /**
   * Set progress within the current state (0–1).
   * Called by the scroll controller.
   * If progress exceeds 0.95, automatically advances to the next state.
   */
  setProgress(p: number): void {
    if (this.transitioning) return;

    // Clamp
    const clamped = p < 0 ? 0 : p > 1 ? 1 : p;

    this.progressValue.value = clamped;

    // Auto-advance when near end of section
    if (clamped >= 0.95) {
      const idx = STATE_ORDER.indexOf(this.currentState);
      if (idx < STATE_ORDER.length - 1) {
        this.next();
      }
    }
  }

  /** Unsubscribe from events and reset state. */
  dispose(): void {
    if (this.unsubScroll) {
      this.unsubScroll();
      this.unsubScroll = null;
    }
    gsap.killTweensOf(this.progressValue);
    this.currentState = TimelineState.PRELOADER;
    this.progressValue.value = 0;
    this.transitioning = false;
  }
}