/**
 * VerisVisuals — Timeline Manager
 * ===================================
 * Finite state machine that controls the experience sections.
 * Order: PRELOADER → HERO → ABOUT → ARCHIVE → DETAIL → CONTACT
 *
 * Scroll progress (0–1) maps to sections as equal segments:
 *   0.00–0.20 = HERO
 *   0.20–0.40 = ABOUT
 *   0.40–0.60 = ARCHIVE
 *   0.60–0.80 = DETAIL
 *   0.80–1.00 = CONTACT
 *
 * Transitions between sections emit `SectionChanged` events.
 *
 * @module timeline
 */

import gsap from 'gsap';
import { EventBus, VerisEvent } from './event-bus';

/** Timeline section states. */
export enum TimelineState {
  PRELOADER = 'PRELOADER',
  HERO = 'HERO',
  ABOUT = 'ABOUT',
  ARCHIVE = 'ARCHIVE',
  DETAIL = 'DETAIL',
  CONTACT = 'CONTACT',
}

/** Canonical order of scrollable states (PRELOADER excluded). */
const SCROLLABLE_STATES: TimelineState[] = [
  TimelineState.HERO,
  TimelineState.ABOUT,
  TimelineState.ARCHIVE,
  TimelineState.DETAIL,
  TimelineState.CONTACT,
];

/** GSAP transition duration in seconds for camera/scene moves. */
const TRANSITION_DURATION = 1.2;

export class TimelineManager {
  private readonly eventBus: EventBus;

  /** Current active state. */
  private currentState: TimelineState = TimelineState.PRELOADER;

  /** Whether a GSAP transition is currently running. */
  private transitioning = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /** Initialize the timeline. */
  init(): void {
    // No scroll subscription needed — app.ts calls setGlobalScroll directly
  }

  /**
   * Force-transition to a specific state (used by assetsLoaded → HERO).
   * Emits `SectionChanged` with `{ from, to }`.
   */
  goto(state: TimelineState): void {
    if (state === this.currentState || this.transitioning) return;

    const from = this.currentState;
    const to = state;

    this.transitioning = true;

    gsap.delayedCall(0.05, () => {
      this.currentState = to;
      this.transitioning = false;
      this.eventBus.emit(VerisEvent.SectionChanged, { from, to });
    });
  }

  /** Advance to the next state in sequence. */
  next(): void {
    const idx = SCROLLABLE_STATES.indexOf(this.currentState);
    if (idx < SCROLLABLE_STATES.length - 1) {
      this.goto(SCROLLABLE_STATES[idx + 1]);
    }
  }

  /** Go back to the previous state in sequence. */
  previous(): void {
    const idx = SCROLLABLE_STATES.indexOf(this.currentState);
    if (idx > 0) {
      this.goto(SCROLLABLE_STATES[idx - 1]);
    }
  }

  /** Get the current active state. */
  getCurrentState(): TimelineState {
    return this.currentState;
  }

  /**
   * Get the current progress within the active state (0–1).
   * Computed from the global scroll value.
   */
  getProgress(): number {
    return this._lastSectionProgress;
  }

  /**
   * Map a global scroll value (0–1) to the correct section and emit transitions.
   * Called every frame from app.ts.
   *
   * @param globalScroll - Normalized scroll position across the entire page [0, 1].
   */
  setGlobalScroll(globalScroll: number): void {
    if (this.currentState === TimelineState.PRELOADER) return;
    if (this.transitioning) return;

    const clamped = globalScroll < 0 ? 0 : globalScroll > 1 ? 1 : globalScroll;
    const numSections = SCROLLABLE_STATES.length;
    const sectionFloat = clamped * numSections;
    const sectionIndex = Math.min(Math.floor(sectionFloat), numSections - 1);
    const sectionProgress = sectionFloat - sectionIndex;

    // Store for getProgress()
    this._lastSectionProgress = sectionProgress;

    const targetState = SCROLLABLE_STATES[sectionIndex];

    if (targetState !== this.currentState) {
      const from = this.currentState;
      this.currentState = targetState;
      this.eventBus.emit(VerisEvent.SectionChanged, { from, to: targetState });
    }
  }

  /** Unsubscribe and reset state. */
  dispose(): void {
    gsap.killTweensOf(this);
    this.currentState = TimelineState.PRELOADER;
    this.transitioning = false;
    this._lastSectionProgress = 0;
  }

  private _lastSectionProgress = 0;
}