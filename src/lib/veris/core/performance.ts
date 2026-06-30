/**
 * VerisVisuals — Performance Monitor
 * ======================================
 * Tracks FPS, draw calls, triangles, and memory usage.
 * Implements adaptive quality: if FPS drops below 45 for 30+ consecutive
 * frames, automatically reduces quality in steps.
 *
 * Quality levels:
 *   0 = Full quality
 *   1 = Reduced bloom
 *   2 = Reduced pixel ratio
 *   3 = Minimal (all effects off)
 *
 * @module performance
 */

import type * as THREE from 'three';
import { EventBus, VerisEvent } from './event-bus';
import { PERFORMANCE, DEBUG } from './config';

/** Rolling window size for FPS averaging. */
const FPS_WINDOW_SIZE = 60;

/** Number of consecutive low-FPS frames before triggering quality reduction. */
const LOW_FPS_FRAME_THRESHOLD = 30;

export class PerformanceMonitor {
  private readonly eventBus: EventBus;

  /** The Three.js WebGLRenderer instance. */
  private renderer: THREE.WebGLRenderer | null = null;

  /** Rolling frame timestamps for FPS calculation. */
  private frameTimes: number[] = [];

  /** Current averaged FPS. */
  private fps = 60;

  /** Current quality level (0 = full, 3 = minimal). */
  private qualityLevel = 0;

  /** Consecutive frames below the adaptive threshold. */
  private lowFPSFrames = 0;

  /** Unsubscribe handle. */
  private unsubDebug: (() => void) | null = null;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Initialize with a reference to the WebGLRenderer.
   * Must be called before `update()`.
   */
  init(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;

    // When DEBUG is true, expose all stats to the console every second
    if (DEBUG) {
      this.unsubDebug = this.logStats();
    }
  }

  /**
   * Call once per frame to update performance tracking.
   * Reads renderer.info, computes FPS, and checks adaptive thresholds.
   */
  update(): void {
    const now = performance.now();

    // Add frame time to rolling window
    this.frameTimes.push(now);
    // Keep only the last N entries
    if (this.frameTimes.length > FPS_WINDOW_SIZE) {
      this.frameTimes.shift();
    }

    // Calculate FPS from the window
    if (this.frameTimes.length >= 2) {
      const oldest = this.frameTimes[0];
      const newest = this.frameTimes[this.frameTimes.length - 1];
      const elapsed = (newest - oldest) / 1000; // seconds
      this.fps = elapsed > 0 ? (this.frameTimes.length - 1) / elapsed : 60;
    }

    // Adaptive quality check
    this.checkAdaptiveQuality();
  }

  /** Get the current average FPS. */
  getFPS(): number {
    return this.fps;
  }

  /** Get the number of draw calls from the last frame. */
  getDrawCalls(): number {
    return this.renderer?.info.render.calls ?? 0;
  }

  /** Get the number of triangles from the last frame. */
  getTriangles(): number {
    return this.renderer?.info.render.triangles ?? 0;
  }

  /** Get geometry and texture memory counts. */
  getMemory(): { geometry: number; textures: number } {
    if (!this.renderer) return { geometry: 0, textures: 0 };
    return {
      geometry: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
    };
  }

  /** Whether quality has been reduced below full. */
  shouldReduceQuality(): boolean {
    return this.qualityLevel > 0;
  }

  /**
   * Get the current quality level.
   * 0 = full, 1 = reduced bloom, 2 = reduced pixel ratio, 3 = minimal.
   */
  getQualityLevel(): number {
    return this.qualityLevel;
  }

  /** Remove debug logging and reset state. */
  dispose(): void {
    if (this.unsubDebug) {
      this.unsubDebug();
      this.unsubDebug = null;
    }
    this.renderer = null;
    this.frameTimes = [];
    this.fps = 60;
    this.qualityLevel = 0;
    this.lowFPSFrames = 0;
  }

  /* ─── Private ──────────────────────────────────────────────────────────────── */

  /**
   * Check if FPS is consistently below the adaptive threshold.
   * If so, step down quality and emit an event.
   */
  private checkAdaptiveQuality(): void {
    const threshold = PERFORMANCE.adaptiveThreshold;

    if (this.fps < threshold && this.fps > 0) {
      this.lowFPSFrames++;
    } else {
      // Reset counter if FPS recovers
      this.lowFPSFrames = Math.max(0, this.lowFPSFrames - 1);
    }

    if (this.lowFPSFrames >= LOW_FPS_FRAME_THRESHOLD) {
      if (this.qualityLevel < 3) {
        this.qualityLevel++;
        this.lowFPSFrames = 0;
        this.eventBus.emit(VerisEvent.QualityChanged, {
          level: this.qualityLevel,
        });
      }
    }
  }

  /**
   * Set up periodic stats logging when DEBUG is enabled.
   * @returns Unsubscribe function.
   */
  private logStats(): () => void {
    const interval = setInterval(() => {
      if (!this.renderer) return;
      console.table({
        FPS: Math.round(this.fps),
        'Draw Calls': this.getDrawCalls(),
        Triangles: this.getTriangles(),
        'Geometries': this.getMemory().geometry,
        Textures: this.getMemory().textures,
        'Quality Level': this.qualityLevel,
      });
    }, 1000);
    return () => clearInterval(interval);
  }
}