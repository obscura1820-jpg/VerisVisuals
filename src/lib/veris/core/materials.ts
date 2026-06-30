/**
 * VerisVisuals — Glass Material Factory
 * ========================================
 * Creates and manages `MeshPhysicalMaterial` instances with
 * glass-like transmission properties. Supports theme-aware
 * roughness transitions via GSAP.
 *
 * @module materials
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { GLASS_MATERIAL } from './config';
import { EventBus } from './event-bus';

/**
 * Factory class for creating and managing glass materials.
 * Tracks all created materials for centralized disposal.
 */
export class VerisMaterials {
  private eventBus: EventBus;

  /** All materials created by this factory for lifecycle management. */
  private readonly materials: Set<THREE.MeshPhysicalMaterial> = new Set();

  /** Current theme state for conditional creation. */
  private isDark = true;

  /**
   * @param eventBus - Shared event bus for inter-module communication.
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Create a new glass material with transmission and physical properties
   * from the project configuration.
   *
   * @returns A new `THREE.MeshPhysicalMaterial` instance.
   */
  createGlassMaterial(): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      transmission: GLASS_MATERIAL.transmission,
      ior: GLASS_MATERIAL.ior,
      thickness: GLASS_MATERIAL.thickness,
      reflectivity: GLASS_MATERIAL.reflectivity,
      clearcoat: GLASS_MATERIAL.clearcoat,
      clearcoatRoughness: GLASS_MATERIAL.clearcoatRoughness,
      metalness: GLASS_MATERIAL.metalness,
      roughness: GLASS_MATERIAL.dark.roughness,
      transparent: true,
      side: THREE.DoubleSide,
    });

    this.materials.add(material);
    return material;
  }

  /**
   * Tween all tracked glass materials to match the given theme.
   * Adjusts roughness and reflectivity via GSAP for smooth transitions.
   *
   * @param isDark - `true` for dark (studio) theme, `false` for light (gallery).
   */
  updateForTheme(isDark: boolean): void {
    this.isDark = isDark;

    const targetRoughness = isDark
      ? GLASS_MATERIAL.dark.roughness
      : GLASS_MATERIAL.light.roughness;

    const targetReflectivity = isDark
      ? GLASS_MATERIAL.reflectivity
      : 0.95;

    const duration = 1.5;
    const ease = 'power2.inOut';

    for (const mat of this.materials) {
      gsap.to(mat, {
        roughness: targetRoughness,
        reflectivity: targetReflectivity,
        duration,
        ease,
      });
    }
  }

  /** Dispose all tracked materials and release GPU resources. */
  dispose(): void {
    for (const mat of this.materials) {
      gsap.killTweensOf(mat);
      mat.dispose();
    }
    this.materials.clear();
  }
}