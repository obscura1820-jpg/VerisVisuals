/**
 * VerisVisuals — Event Bus
 * ==========================
 * Decoupled publish / subscribe system.
 * All inter-module communication goes through events.
 * Every listener is stored by reference so it can be removed.
 *
 * @module event-bus
 */

/** Callback signature shared by all events. */
export type EventCallback = (...args: unknown[]) => void;

/**
 * Known event names — typed for discoverability.
 * Modules may emit custom strings too; this enum covers the standard set.
 */
export enum VerisEvent {
  /** All assets (fonts, HDR, textures, models) have finished loading. */
  AssetsLoaded = 'assetsLoaded',
  /** Theme has changed. Payload: `{ theme: 'studio' | 'gallery' }` */
  ThemeChanged = 'themeChanged',
  /** Timeline section changed. Payload: `{ from, to }` */
  SectionChanged = 'sectionChanged',
  /** Mouse entered a hoverable object. */
  HoverStart = 'hoverStart',
  /** Mouse left a hoverable object. */
  HoverEnd = 'hoverEnd',
  /** Camera position/rotation updated. */
  CameraMove = 'cameraMove',
  /** First frame has been rendered. */
  RenderReady = 'renderReady',
  /** Loading progress updated. Payload: `{ progress: 0–1 }` */
  LoadProgress = 'loadProgress',
  /** Scroll value updated. Payload: `{ value: 0–1 }` */
  ScrollUpdate = 'scrollUpdate',
  /** Quality level changed (adaptive performance). */
  QualityChanged = 'qualityChanged',
  /** Window resized. */
  Resize = 'resize',
}

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  /**
   * Subscribe to an event.
   * @returns An unsubscribe function for easy cleanup.
   */
  on(event: string, callback: EventCallback): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event, but auto-unsubscribe after the first emission.
   * @returns An unsubscribe function.
   */
  once(event: string, callback: EventCallback): () => void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove a specific listener.
   */
  off(event: string, callback: EventCallback): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with optional payload.
   * All registered callbacks fire in insertion order.
   */
  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(...args);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    }
  }

  /**
   * Remove ALL listeners for a specific event, or all events if omitted.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}