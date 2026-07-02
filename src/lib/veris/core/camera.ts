/**
 * VerisVisuals — Camera Controller
 * ===================================
 * PerspectiveCamera with Lissajous drift breathing and mouse parallax.
 * Respects `prefers-reduced-motion` for accessibility.
 *
 * @module camera
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { CAMERA } from './config';
import { criticallyDampedStep } from './utils';
import { EventBus } from './event-bus';
import { VerisEvent } from './event-bus';

/**
 * Controls the main perspective camera with cinematic breathing drift
 * and mouse-driven parallax offset.
 */
export class VerisCamera {
  private camera: THREE.PerspectiveCamera | null = null;
  private eventBus: EventBus;

  /** Base position target that GSAP tweens animate toward. */
  private baseTarget = new THREE.Vector3(
    CAMERA.initialPosition.x,
    CAMERA.initialPosition.y,
    CAMERA.initialPosition.z,
  );

  /** Look-at target. */
  private lookAtTarget = new THREE.Vector3(
    CAMERA.lookAt.x,
    CAMERA.lookAt.y,
    CAMERA.lookAt.z,
  );

  /** Smoothed mouse offset for parallax (no allocation in loop). */
  private smoothMouseX = 0;
  private smoothMouseY = 0;

  /** Whether the user prefers reduced motion. */
  private prefersReducedMotion: boolean;

  /** Throttled emit wrapper for CameraMove events. */
  private throttledEmit: (x: number, y: number, z: number) => void;

  /** Reusable vector to avoid allocation inside the animation loop. */
  private readonly _tempVec = new THREE.Vector3();

  /**
   * @param eventBus - Shared event bus for inter-module communication.
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.throttledEmit = this.createThrottledEmit(100);
  }

  /**
   * Create a throttled version of the CameraMove emitter.
   * Avoids excessive event firing during continuous camera movement.
   */
  private createThrottledEmit(
    ms: number,
  ): (x: number, y: number, z: number) => void {
    let last = 0;
    return (x: number, y: number, z: number) => {
      const now = performance.now();
      if (now - last >= ms) {
        last = now;
        this.eventBus.emit(VerisEvent.CameraMove, { x, y, z });
      }
    };
  }

  /**
   * Initialize the perspective camera.
   * @param width  - Viewport width in CSS pixels.
   * @param height - Viewport height in CSS pixels.
   * @returns The created `THREE.PerspectiveCamera`.
   */
  init(width: number, height: number): THREE.PerspectiveCamera {
    const aspect = width > 0 && height > 0 ? width / height : 1;

    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      aspect,
      CAMERA.near,
      CAMERA.far,
    );

    this.camera.position.set(
      CAMERA.initialPosition.x,
      CAMERA.initialPosition.y,
      CAMERA.initialPosition.z,
    );

    this.camera.lookAt(
      this.lookAtTarget.x,
      this.lookAtTarget.y,
      this.lookAtTarget.z,
    );

    return this.camera;
  }

  /** Return the managed perspective camera. */
  getCamera(): THREE.PerspectiveCamera {
    if (!this.camera) {
      throw new Error(
        '[VerisCamera] Camera not initialized. Call init() first.',
      );
    }
    return this.camera;
  }

  /**
   * Per-frame camera update with Lissajous drift and mouse parallax.
   * No memory allocation occurs inside this method.
   *
   * @param deltaTime   - Seconds since the last frame.
   * @param elapsedTime - Total elapsed seconds since start.
   * @param mouseNormX  - Normalized mouse X in [-1, 1].
   * @param mouseNormY  - Normalized mouse Y in [-1, 1].
   */
  update(
    deltaTime: number,
    elapsedTime: number,
    mouseNormX: number,
    mouseNormY: number,
  ): void {
    if (!this.camera) return;

    if (this.prefersReducedMotion) {
      // Snap directly to base target — no drift, no parallax
      this.camera.position.copy(this.baseTarget);
      this.camera.lookAt(this.lookAtTarget);
      return;
    }

    // Lissajous continuous breathing drift
    const lissX =
      CAMERA.lissajous.xAmplitude *
      Math.sin(
        CAMERA.lissajous.xFrequency * elapsedTime + CAMERA.lissajous.xPhase,
      );
    const lissY =
      CAMERA.lissajous.yAmplitude *
      Math.sin(CAMERA.lissajous.yFrequency * elapsedTime);
    const lissZ =
      CAMERA.lissajous.zAmplitude *
      Math.cos(CAMERA.lissajous.zFrequency * elapsedTime);

    // Mouse parallax — critically damped interpolation
    const targetMouseX = mouseNormX * CAMERA.mouse.xMultiplier;
    const targetMouseY = mouseNormY * CAMERA.mouse.yMultiplier;

    this.smoothMouseX = criticallyDampedStep(
      this.smoothMouseX,
      targetMouseX,
      CAMERA.mouse.lerpFactor,
    );
    this.smoothMouseY = criticallyDampedStep(
      this.smoothMouseY,
      targetMouseY,
      CAMERA.mouse.lerpFactor,
    );

    // Combine: baseTarget + lissajous + mouseOffset
    this._tempVec.set(
      this.baseTarget.x + lissX + this.smoothMouseX,
      this.baseTarget.y + lissY + this.smoothMouseY,
      this.baseTarget.z + lissZ,
    );

    this.camera.position.copy(this._tempVec);
    this.camera.lookAt(this.lookAtTarget);

    // Throttled position change event
    this.throttledEmit(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z,
    );
  }

  /**
   * Smoothly animate the camera's base position to a target using GSAP.
   * @param x - Target X coordinate.
   * @param y - Target Y coordinate.
   * @param z - Target Z coordinate.
   */
  setPositionTarget(x: number, y: number, z: number): void {
    gsap.to(this.baseTarget, {
      x,
      y,
      z,
      duration: 1.5,
      ease: 'power2.inOut',
    });
  }

  /**
   * Set the look-at target the camera faces.
   * @param x - Target X coordinate.
   * @param y - Target Y coordinate.
   * @param z - Target Z coordinate.
   */
  setLookAt(x: number, y: number, z: number): void {
    this.lookAtTarget.set(x, y, z);
  }

  /**
   * Get the camera's current world position.
   * @returns Current position as `{ x, y, z }`.
   */
  getPosition(): { x: number; y: number; z: number } {
    if (!this.camera) {
      return {
        x: this.baseTarget.x,
        y: this.baseTarget.y,
        z: this.baseTarget.z,
      };
    }
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
  }

  /**
   * Update the camera aspect ratio and projection matrix on resize.
   * @param width  - New viewport width in CSS pixels.
   * @param height - New viewport height in CSS pixels.
   */
  resize(width: number, height: number): void {
    if (!this.camera) return;
    const aspect = width > 0 && height > 0 ? width / height : 1;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Clean up GSAP tweens and release references. */
  dispose(): void {
    gsap.killTweensOf(this.baseTarget);
    gsap.killTweensOf(this.lookAtTarget);
    this.camera = null;
  }
}