/**
 * VerisVisuals — Theme Manager
 * ================================
 * Manages two themes: Studio Ambient (dark) and Gallery Day (light).
 * Smooth transitions via GSAP tween over the configured duration.
 * Uses a proxy object for tweening — GSAP cannot tween THREE.Color directly.
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

/** Internal interpolation state. */
interface ThemeLerpState {
  background: THREE.Color;
  foreground: THREE.Color;
  fogColor: THREE.Color;
  glassRoughness: number;
  exposure: number;
  lightIntensityMultiplier: number;
  bloomStrength: number;
}

/** Numeric proxy for GSAP to tween. THREE.Color is not GSAP-tweenable directly. */
interface ThemeTweenProxy {
  bgR: number; bgG: number; bgB: number;
  fgR: number; fgG: number; fgB: number;
  fogR: number; fogG: number; fogB: number;
  glassRoughness: number;
  exposure: number;
  lightIntensityMultiplier: number;
  bloomStrength: number;
}

export class ThemeManager {
  private readonly eventBus: EventBus;

  /** Current theme name. */
  private currentIsDark: boolean;

  /** Tweened interpolation state (what consumers read). */
  private lerpState: ThemeLerpState;

  /** GSAP-tweenable numeric proxy. Updated each frame via onUpdate. */
  private tweenProxy: ThemeTweenProxy;

  /** Whether a GSAP transition is active. */
  private transitioning = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.currentIsDark = true;

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

    this.tweenProxy = this.stateToProxy(this.lerpState);
  }

  /**
   * Initialize with the current theme state.
   * @param currentIsDark - Whether the app starts in dark mode.
   */
  init(currentIsDark: boolean): void {
    this.currentIsDark = currentIsDark;
    const theme = currentIsDark ? THEMES.studio : THEMES.gallery;
    this.applyThemeToState(theme, this.lerpState);
    this.tweenProxy = this.stateToProxy(this.lerpState);
  }

  /** Toggle between dark and light themes. */
  toggle(): void {
    this.setTheme(!this.currentIsDark);
  }

  /**
   * Set theme explicitly.
   * Triggers a GSAP tween over `THEMES.transitionDuration` ms.
   * Emits `ThemeChanged` on every onUpdate frame (not just onComplete).
   */
  setTheme(isDark: boolean): void {
    if (isDark === this.currentIsDark && !this.transitioning) return;

    this.currentIsDark = isDark;
    const targetTheme = isDark ? THEMES.studio : THEMES.gallery;

    // Capture target as numeric proxy
    const targetProxy = {
      bgR: ((targetTheme.background >> 16) & 0xff) / 255,
      bgG: ((targetTheme.background >> 8) & 0xff) / 255,
      bgB: (targetTheme.background & 0xff) / 255,
      fgR: ((targetTheme.foreground >> 16) & 0xff) / 255,
      fgG: ((targetTheme.foreground >> 8) & 0xff) / 255,
      fgB: (targetTheme.foreground & 0xff) / 255,
      fogR: ((targetTheme.fogColor >> 16) & 0xff) / 255,
      fogG: ((targetTheme.fogColor >> 8) & 0xff) / 255,
      fogB: (targetTheme.fogColor & 0xff) / 255,
      glassRoughness: targetTheme.glassRoughness,
      exposure: targetTheme.exposure,
      lightIntensityMultiplier: targetTheme.lightIntensityMultiplier,
      bloomStrength: targetTheme.bloomStrength,
    };

    this.transitioning = true;

    gsap.to(this.tweenProxy, {
      ...targetProxy,
      duration: THEMES.transitionDuration / 1000,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.proxyToState(this.tweenProxy, this.lerpState);
        this.eventBus.emit(VerisEvent.ThemeChanged, {
          theme: isDark ? 'studio' : 'gallery',
        });
      },
      onComplete: () => {
        this.transitioning = false;
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
   * For color properties, returns the hex number.
   * For numeric properties, returns the number.
   */
  getInterpolatedValue(property: string, t: number): number {
    const ct = clamp01(t);
    const currentTheme = this.currentIsDark ? THEMES.studio : THEMES.gallery;
    const otherTheme = this.currentIsDark ? THEMES.gallery : THEMES.studio;

    switch (property) {
      case 'background': {
        const c = new THREE.Color(currentTheme.background).lerp(
          new THREE.Color(otherTheme.background), ct,
        );
        return c.getHex();
      }
      case 'fogColor': {
        const c = new THREE.Color(currentTheme.fogColor).lerp(
          new THREE.Color(otherTheme.fogColor), ct,
        );
        return c.getHex();
      }
      case 'exposure':
        return currentTheme.exposure + (otherTheme.exposure - currentTheme.exposure) * ct;
      case 'glassRoughness':
        return currentTheme.glassRoughness + (otherTheme.glassRoughness - currentTheme.glassRoughness) * ct;
      case 'lightIntensityMultiplier':
        return currentTheme.lightIntensityMultiplier +
          (otherTheme.lightIntensityMultiplier - currentTheme.lightIntensityMultiplier) * ct;
      case 'bloomStrength':
        return currentTheme.bloomStrength + (otherTheme.bloomStrength - currentTheme.bloomStrength) * ct;
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
    gsap.killTweensOf(this.tweenProxy);
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

  /** Convert ThemeLerpState to a GSAP-tweenable numeric proxy. */
  private stateToProxy(state: ThemeLerpState): ThemeTweenProxy {
    return {
      bgR: state.background.r,
      bgG: state.background.g,
      bgB: state.background.b,
      fgR: state.foreground.r,
      fgG: state.foreground.g,
      fgB: state.foreground.b,
      fogR: state.fogColor.r,
      fogG: state.fogColor.g,
      fogB: state.fogColor.b,
      glassRoughness: state.glassRoughness,
      exposure: state.exposure,
      lightIntensityMultiplier: state.lightIntensityMultiplier,
      bloomStrength: state.bloomStrength,
    };
  }

  /** Write proxy numeric values back to the ThemeLerpState's THREE.Colors and numbers. */
  private proxyToState(proxy: ThemeTweenProxy, state: ThemeLerpState): void {
    state.background.setRGB(proxy.bgR, proxy.bgG, proxy.bgB);
    state.foreground.setRGB(proxy.fgR, proxy.fgG, proxy.fgB);
    state.fogColor.setRGB(proxy.fogR, proxy.fogG, proxy.fogB);
    state.glassRoughness = proxy.glassRoughness;
    state.exposure = proxy.exposure;
    state.lightIntensityMultiplier = proxy.lightIntensityMultiplier;
    state.bloomStrength = proxy.bloomStrength;
  }
}