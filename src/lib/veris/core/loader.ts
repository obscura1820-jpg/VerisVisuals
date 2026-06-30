/**
 * VerisVisuals — Asset Manager
 * ==============================
 * Manages loading and retrieval of all engine assets.
 * For Milestone 1, simulates a loading sequence with eased progress.
 * Real asset loading infrastructure (textures, HDRs, models) will be added later.
 *
 * @module loader
 */

import { EventBus, VerisEvent } from './event-bus';
import { easeInOutQuart, now } from './utils';

/** Simulated load duration in seconds for Milestone 1. */
const SIMULATED_LOAD_DURATION = 2.5;

/** Number of progress emission steps during simulation. */
const LOAD_STEPS = 40;

export class AssetManager {
  private readonly eventBus: EventBus;
  private assets = new Map<string, unknown>();
  private progress = 0;
  private loadResolve: (() => void) | null = null;
  private disposed = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Begin loading all assets. Resolves when complete.
   * Simulates a 2.5s load with easeInOutQuart easing, emitting progress events.
   */
  load(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.loadResolve = resolve;
      this.runSimulatedLoad();
    });
  }

  /**
   * Retrieve a loaded asset by key.
   * @throws {Error} If the asset key does not exist.
   */
  get<T>(key: string): T {
    const asset = this.assets.get(key);
    if (asset === undefined) {
      throw new Error(`[AssetManager] Asset "${key}" not found.`);
    }
    return asset as T;
  }

  /** Current loading progress from 0 to 1. */
  getProgress(): number {
    return this.progress;
  }

  /** Clean up internal state. */
  dispose(): void {
    this.disposed = true;
    this.assets.clear();
    this.loadResolve = null;
    this.progress = 0;
  }

  /* ─── Private ──────────────────────────────────────────────────────────────── */

  /**
   * Simulate an async loading sequence with eased progress.
   * Divides the load duration into small steps and emits progress events.
   */
  private runSimulatedLoad(): void {
    const startTime = now();
    const stepDuration = SIMULATED_LOAD_DURATION / LOAD_STEPS;
    let step = 0;

    const tick = (): void => {
      if (this.disposed) return;

      step++;
      const linearProgress = Math.min(step / LOAD_STEPS, 1);
      const easedProgress = easeInOutQuart(linearProgress);

      this.progress = easedProgress;
      this.eventBus.emit(VerisEvent.LoadProgress, { progress: easedProgress });

      if (linearProgress >= 1) {
        this.eventBus.emit(VerisEvent.AssetsLoaded);
        this.loadResolve?.();
        return;
      }

      setTimeout(tick, stepDuration * 1000);
    };

    tick();
  }
}