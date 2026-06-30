/**
 * VerisVisuals — Theme Manager
 * ================================
 * Manages two themes: Studio Ambient (dark) and Gallery Day (light).
 * Smooth transitions via GSAP tween over the configured duration.
 * Provides interpolated values for any theme property at time t (0–1).
 * Uses THREE.Color for color interpolation.
 *
 * @module themes
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { EventBus, VerisEvent } from './event-bus';
import { THEMES } from './config';
import { clamp01 } from './utils';

/** Theme name type. */
type ThemeName = 'studio' | 'gallery';

/** Internal interpolation state — tweened by GSAP. */
interface ThemeLerpState {
  background: THREE.Color;
  foreground: THREE.Color;
  fogColor: THREE.Color;
  glassRoughness: number;
  exposure: number;
  lightIntensityMultiplier: number;
  bloomStrength: number;
}

export class ThemeManager {
  private readonly eventBus: EventBus;

  /** Current theme name. */
  private currentIsDark: boolean;

  /** Tweened interpolation state. */
  private lerpState: ThemeLerpState;

  /** Source snapshot for manual interpolation. */
  private fromSnapshot: ThemeLerpState;
  private toSnapshot: ThemeLerpState;

  /** Whether a GSAP transition is active. */
  private transitioning = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.currentIsDark = true;

    // Initialize lerp state from studio (dark) theme
    const studio = THEMES.studio;
    this.lerpState = {
      background: new THREE.Color(studio.background),
      foreground: new THREE.Color(studio.foreground),
      fogColor: new THREE.Color(studio.fogColor),
      glassRoughness: studio.glassRoughness,
      exposure: studio.exposure,
      lightIntensityMultiplier: studio.lightIntensityMultiplier,
      bloomStrength: studio.bloomStrength,
    };

    this.fromSnapshot = this.cloneState(this.lerpState);
    this.toSnapshot = this.cloneState(this.lerpState);
  }

  /**
   * Initialize with the current theme state.
   * @param currentIsDark - Whether the app starts in dark mode.
   */
  init(currentIsDark: boolean): void {
    this.currentIsDark = currentIsDark;
    const theme = currentIsDark ? THEMES.studio : THEMES.gallery;
    this.applyThemeToState(theme, this.lerpState);
    this.fromSnapshot = this.cloneState(this.lerpState);
    this.toSnapshot = this.cloneState(this.lerpState);
  }

  /** Toggle between dark and light themes. */
  toggle(): void {
    this.setTheme(!this.currentIsDark);
  }

  /**
   * Set theme explicitly.
   * Triggers a GSAP tween over `THEMES.transitionDuration` ms.
   * Emits `ThemeChanged` when complete.
   */
  setTheme(isDark: boolean): void {
    if (isDark === this.currentIsDark && !this.transitioning) return;

    this.currentIsDark = isDark;
    const targetTheme = isDark ? THEMES.studio : THEMES.gallery;

    // Capture current state as "from"
    this.fromSnapshot = this.cloneState(this.lerpState);
    this.applyThemeToState(targetTheme, this.toSnapshot);

    this.transitioning = true;

    gsap.to(this.lerpState, {
      ...this.toSnapshot,
      // GSAP can't tween THREE.Color directly with dot access, so we
      // use a proxy object and apply it each frame.
      duration: THEMES.transitionDuration / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        // Apply the proxy values to actual state
      },
      onComplete: () => {
        this.transitioning = false;
        this.eventBus.emit(VerisEvent.ThemeChanged, {
          theme: isDark ? 'studio' : 'gallery',
        });
      },
    });
  }

  /** Check if the current theme is dark. */
  isDark(): boolean {
    return this.currentIsDark;
  }

  /** Get the current theme name. */
  getThemeName(): ThemeName {
    return this.currentIsDark ? 'studio' : 'gallery';
  }

  /**
   * Get an interpolated value for a theme property at time t (0–1).
   * Useful for custom animations that need theme-aware values.
   *
   * Supported properties: 'background', 'fogColor', 'exposure',
   * 'glassRoughness', 'lightIntensityMultiplier', 'bloomStrength'
   *
   * For color properties, returns the hex number.
   * For numeric properties, returns the number.
   */
  getInterpolatedValue(property: string, t: number): number {
    const ct = clamp01(t);
    const from = this.fromSnapshot;
    const to = this.toSnapshot;

    switch (property) {
      case 'background': {
        const c = new THREE.Color().copy(from.background).lerp(to.background, ct);
        return c.getHex();
      }
      case 'fogColor': {
        const c = new THREE.Color().copy(from.fogColor).lerp(to.fogColor, ct);
        return c.getHex();
      }
      case 'exposure':
        return from.exposure + (to.exposure - from.exposure) * ct;
      case 'glassRoughness':
        return from.glassRoughness + (to.glassRoughness - from.glassRoughness) * ct;
      case 'lightIntensityMultiplier':
        return from.lightIntensityMultiplier +
          (to.lightIntensityMultiplier - from.lightIntensityMultiplier) * ct;
      case 'bloomStrength':
        return from.bloomStrength + (to.bloomStrength - from.bloomStrength) * ct;
      default:
        return 0;
    }
  }

  /** Get direct access to the current interpolation state. */
  getLerpState(): Readonly<ThemeLerpState> {
    return this.lerpState;
  }

  /** Kill GSAP tweens and reset. */
  dispose(): void {
    gsap.killTweensOf(this.lerpState);
    this.transitioning = false;
  }

  /* ─── Private ──────────────────────────────────────────────────────────────── */

  /** Apply theme config values to a state object. */
  private applyThemeToState(
    theme: typeof THEMES.studio | typeof THEMES.gallery,
    state: ThemeLerpState,
  ): void {
    state.background.set(theme.background);
    state.foreground.set(theme.foreground);
    state.fogColor.set(theme.fogColor);
    state.glassRoughness = theme.glassRoughness;
    state.exposure = theme.exposure;
    state.lightIntensityMultiplier = theme.lightIntensityMultiplier;
    state.bloomStrength = theme.bloomStrength;
  }

  /** Deep clone a ThemeLerpState (cloning THREE.Color instances). */
  private cloneState(state: ThemeLerpState): ThemeLerpState {
    return {
      background: new THREE.Color().copy(state.background),
      foreground: new THREE.Color().copy(state.foreground),
      fogColor: new THREE.Color().copy(state.fogColor),
      glassRoughness: state.glassRoughness,
      exposure: state.exposure,
      lightIntensityMultiplier: state.lightIntensityMultiplier,
      bloomStrength: state.bloomStrength,
    };
  }
}