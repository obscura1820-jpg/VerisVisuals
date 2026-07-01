/**
 * VerisVisuals — Scene Manager
 * ===============================
 * Manages the Three.js scene, fog, background, and ambient particle system.
 *
 * @module scene
 */

import * as THREE from 'three';
import { SCENE, PARTICLES } from './config';
import { EventBus } from './event-bus';

/** Reusable vector to avoid allocation inside the animation loop. */
const _particlePos = new THREE.Vector3();

/**
 * Manages the main Three.js scene, background, fog, and floating particles.
 */
export class VerisScene {
  private scene: THREE.Scene | null = null;
  private eventBus: EventBus;
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private velocities: Float32Array | null = null;

  /**
   * @param eventBus - Shared event bus for inter-module communication.
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Create and configure the Three.js scene with fog and background color.
   * @returns The created `THREE.Scene` instance.
   */
  init(): THREE.Scene {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE.background);
    this.scene.fog = new THREE.FogExp2(SCENE.fogColor, SCENE.fogDensity);

    return this.scene;
  }

  /** Return the managed Three.js scene. */
  getScene(): THREE.Scene {
    if (!this.scene) {
      throw new Error('[VerisScene] Scene not initialized. Call init() first.');
    }
    return this.scene;
  }

  /**
   * Create the ambient floating particle system and add it to the scene.
   * @returns The `THREE.Points` mesh for the particle system.
   */
  createParticles(): THREE.Points {
    if (!this.scene) {
      throw new Error('[VerisScene] Scene not initialized. Call init() first.');
    }

    const count = PARTICLES.count;
    this.particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * PARTICLES.spreadX;
      positions[i3 + 1] = (Math.random() - 0.5) * PARTICLES.spreadY;
      positions[i3 + 2] = (Math.random() - 0.5) * PARTICLES.spreadZ;

      // Slow random velocities for organic floating
      this.velocities[i3] = (Math.random() - 0.5) * 0.003;
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
    }

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );

    this.particleMaterial = new THREE.PointsMaterial({
      size: PARTICLES.size,
      sizeAttenuation: PARTICLES.sizeAttenuation,
      blending: THREE.AdditiveBlending,
      depthWrite: PARTICLES.depthWrite,
      transparent: true,
      opacity: PARTICLES.opacity,
      color: 0xffffff,
    });

    this.particles = new THREE.Points(
      this.particleGeometry,
      this.particleMaterial,
    );
    this.scene.add(this.particles);

    return this.particles;
  }

  /**
   * Set the scene background color.
   * @param color - Any valid Three.js color representation.
   */
  setBackground(color: THREE.ColorRepresentation): void {
    if (!this.scene) return;
    this.scene.background = new THREE.Color(color);
  }

  /**
   * Update the fog density.
   * @param density - New fog density value.
   */
  setFogDensity(density: number): void {
    const fog = this.scene?.fog as THREE.FogExp2 | undefined;
    if (fog instanceof THREE.FogExp2) {
      fog.density = density;
    }
  }

  /**
   * Update the fog color.
   * @param color - Any valid Three.js color representation.
   */
  setFogColor(color: THREE.ColorRepresentation): void {
    const fog = this.scene?.fog as THREE.FogExp2 | undefined;
    if (fog instanceof THREE.FogExp2) {
      fog.color.set(color);
    }
  }

  /**
   * Animate particle positions with floating + sine wobble, boundary wrapping.
   * No memory allocation occurs inside this method.
   *
   * @param deltaTime   - Seconds since the last frame.
   * @param elapsedTime - Total elapsed seconds since start.
   */
  updateParticles(deltaTime: number, elapsedTime: number): void {
    if (
      !this.particles ||
      !this.particleGeometry ||
      !this.velocities
    ) return;

    const positions = this.particleGeometry.attributes.position
      .array as Float32Array;
    const count = PARTICLES.count;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Apply velocity with slow floating
      positions[i3] += this.velocities[i3] + Math.sin(elapsedTime * 0.2 + i) * 0.0005;
      positions[i3 + 1] += this.velocities[i3 + 1] + Math.cos(elapsedTime * 0.15 + i * 0.7) * 0.0004;
      positions[i3 + 2] += this.velocities[i3 + 2] + Math.sin(elapsedTime * 0.18 + i * 1.3) * 0.0003;

      // Boundary wrapping
      const halfX = PARTICLES.spreadX * 0.5;
      const halfY = PARTICLES.spreadY * 0.5;
      const halfZ = PARTICLES.spreadZ * 0.5;

      if (positions[i3] > halfX) positions[i3] -= PARTICLES.spreadX;
      else if (positions[i3] < -halfX) positions[i3] += PARTICLES.spreadX;

      if (positions[i3 + 1] > halfY) positions[i3 + 1] -= PARTICLES.spreadY;
      else if (positions[i3 + 1] < -halfY) positions[i3 + 1] += PARTICLES.spreadY;

      if (positions[i3 + 2] > halfZ) positions[i3 + 2] -= PARTICLES.spreadZ;
      else if (positions[i3 + 2] < -halfZ) positions[i3 + 2] += PARTICLES.spreadZ;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
  }

  /**
   * Change the particle color.
   * @param color - Any valid Three.js color representation.
   */
  setParticleColor(color: THREE.ColorRepresentation): void {
    if (this.particleMaterial) {
      this.particleMaterial.color.set(color);
    }
  }

  /**
   * Change the particle opacity.
   * @param opacity - Opacity value in [0, 1].
   */
  setParticleOpacity(opacity: number): void {
    if (this.particleMaterial) {
      this.particleMaterial.opacity = opacity;
    }
  }

  /** Dispose all geometries, materials, and clean up references. */
  dispose(): void {
    if (this.particles && this.scene) {
      this.scene.remove(this.particles);
    }
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
    this.velocities = null;
    this.particles = null;
    this.particleGeometry = null;
    this.particleMaterial = null;

    // Clean up scene fog
    if (this.scene) {
      this.scene.fog = null;
      this.scene.background = null;
      this.scene.clear();
    }
    this.scene = null;
  }
}