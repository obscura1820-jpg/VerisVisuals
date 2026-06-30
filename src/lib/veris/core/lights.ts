/**
 * VerisVisuals — Lighting System
 * =================================
 * Key / Fill / Back-Rim three-point lighting + ambient fill.
 * Intensities scale proportionally via GSAP tweening.
 *
 * @module lights
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { LIGHTS } from './config';
import { EventBus } from './event-bus';

/** Light configuration entry used internally. */
interface LightEntry {
  light: THREE.PointLight;
  originalIntensity: number;
}

/**
 * Manages a cinematic three-point lighting setup with ambient fill.
 * Supports global intensity scaling via GSAP for theme transitions.
 */
export class VerisLights {
  private scene: THREE.Scene | null = null;
  private eventBus: EventBus;

  private keyLight: THREE.PointLight;
  private fillLight: THREE.PointLight;
  private backRimLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;

  /** Original (base) intensities before any multiplier is applied. */
  private originalIntensities: {
    key: number;
    fill: number;
    backRim: number;
    ambient: number;
  };

  /** Current global intensity multiplier (1.0 = baseline). */
  private intensityMultiplier = 1.0;

  /** All point lights for bulk operations. */
  private pointLights: LightEntry[];

  /**
   * @param scene    - The Three.js scene to add lights to.
   * @param eventBus - Shared event bus for inter-module communication.
   */
  constructor(scene: THREE.Scene, eventBus: EventBus) {
    this.scene = scene;
    this.eventBus = eventBus;

    // ── Key Light ──────────────────────────────────────────────────────────
    this.keyLight = new THREE.PointLight(
      LIGHTS.key.color,
      LIGHTS.key.intensity,
      LIGHTS.key.distance,
      LIGHTS.key.decay,
    );
    this.keyLight.position.set(
      LIGHTS.key.position.x,
      LIGHTS.key.position.y,
      LIGHTS.key.position.z,
    );

    // ── Fill Light ─────────────────────────────────────────────────────────
    this.fillLight = new THREE.PointLight(
      LIGHTS.fill.color,
      LIGHTS.fill.intensity,
      LIGHTS.fill.distance,
      LIGHTS.fill.decay,
    );
    this.fillLight.position.set(
      LIGHTS.fill.position.x,
      LIGHTS.fill.position.y,
      LIGHTS.fill.position.z,
    );

    // ── Back Rim Light ─────────────────────────────────────────────────────
    this.backRimLight = new THREE.PointLight(
      LIGHTS.backRim.color,
      LIGHTS.backRim.intensity,
      LIGHTS.backRim.distance,
      LIGHTS.backRim.decay,
    );
    this.backRimLight.position.set(
      LIGHTS.backRim.position.x,
      LIGHTS.backRim.position.y,
      LIGHTS.backRim.position.z,
    );

    // ── Ambient Fill ───────────────────────────────────────────────────────
    this.ambientLight = new THREE.AmbientLight(
      LIGHTS.ambient.color,
      LIGHTS.ambient.intensity,
    );

    // Store originals for proportional scaling
    this.originalIntensities = {
      key: LIGHTS.key.intensity,
      fill: LIGHTS.fill.intensity,
      backRim: LIGHTS.backRim.intensity,
      ambient: LIGHTS.ambient.intensity,
    };

    this.pointLights = [
      { light: this.keyLight, originalIntensity: LIGHTS.key.intensity },
      { light: this.fillLight, originalIntensity: LIGHTS.fill.intensity },
      {
        light: this.backRimLight,
        originalIntensity: LIGHTS.backRim.intensity,
      },
    ];
  }

  /** Add all lights to the scene. */
  init(): void {
    if (!this.scene) return;

    this.scene.add(this.keyLight);
    this.scene.add(this.fillLight);
    this.scene.add(this.backRimLight);
    this.scene.add(this.ambientLight);
  }

  /**
   * Per-frame update hook for animated light properties.
   * Currently minimal for the M1 milestone — reserved for future pulsing.
   */
  update(): void {
    // Reserved for frame-by-frame light animations (e.g. subtle intensity pulse)
  }

  /**
   * Scale all light intensities proportionally using GSAP.
   * E.g. multiplier=0.7 dims everything to 70% of baseline.
   *
   * @param multiplier - New global intensity multiplier (1.0 = baseline).
   */
  setIntensityMultiplier(multiplier: number): void {
    this.intensityMultiplier = multiplier;

    const duration = 1.5;
    const ease = 'power2.inOut';

    for (const entry of this.pointLights) {
      gsap.to(entry.light, {
        intensity: entry.originalIntensity * multiplier,
        duration,
        ease,
      });
    }

    gsap.to(this.ambientLight, {
      intensity: this.originalIntensities.ambient * multiplier,
      duration,
      ease,
    });
  }

  /** Return the current global intensity multiplier. */
  getIntensityMultiplier(): number {
    return this.intensityMultiplier;
  }

  /** Dispose all lights and remove from the scene. */
  dispose(): void {
    gsap.killTweensOf(this.keyLight);
    gsap.killTweensOf(this.fillLight);
    gsap.killTweensOf(this.backRimLight);
    gsap.killTweensOf(this.ambientLight);

    if (this.scene) {
      this.scene.remove(this.keyLight);
      this.scene.remove(this.fillLight);
      this.scene.remove(this.backRimLight);
      this.scene.remove(this.ambientLight);
    }

    this.keyLight.dispose();
    this.fillLight.dispose();
    this.backRimLight.dispose();
    this.ambientLight.dispose();

    this.scene = null;
  }
}