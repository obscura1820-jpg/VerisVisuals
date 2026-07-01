/**
 * VerisVisuals — WebGL Renderer Wrapper
 * ========================================
 * Wraps `THREE.WebGLRenderer` with project-standard defaults:
 * ACES Filmic tone mapping, SRGB output, pixel ratio capping.
 *
 * @module renderer
 */

import * as THREE from 'three';
import { RENDERER, SCENE } from './config';
import { type EventBus, VerisEvent } from './event-bus';

/**
 * Manages the Three.js WebGL renderer lifecycle.
 * Handles creation, pixel ratio capping, resizing, and disposal.
 */
export class VerisRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement;
  private eventBus: EventBus;
  private pixelRatio: number;
  private hasEmittedReady = false;

  /**
   * @param container  - DOM element to append the renderer canvas to.
   * @param eventBus  - Shared event bus for inter-module communication.
   */
  constructor(container: HTMLElement, eventBus: EventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this.pixelRatio = Math.min(window.devicePixelRatio, RENDERER.maxPixelRatio);
  }

  /** Create the WebGL renderer, configure it, and append its canvas to the container. */
  init(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: RENDERER.antialias,
      alpha: RENDERER.alpha,
      powerPreference: RENDERER.powerPreference,
      stencil: RENDERER.stencil,
      depth: RENDERER.depth,
    });

    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDERER.exposure;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (RENDERER.shadowMap) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.renderer.setClearColor(SCENE.background);

    this.container.appendChild(this.renderer.domElement);
  }

  /** Render a frame and emit `RenderReady` on the first call. */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (!this.renderer) return;

    this.renderer.render(scene, camera);

    if (!this.hasEmittedReady) {
      this.hasEmittedReady = true;
      this.eventBus.emit(VerisEvent.RenderReady);
    }
  }

  /** Return the underlying Three.js WebGL renderer instance. */
  getRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      throw new Error('[VerisRenderer] Renderer not initialized. Call init() first.');
    }
    return this.renderer;
  }

  /** Return the current pixel ratio (capped at `RENDERER.maxPixelRatio`). */
  getPixelRatio(): number {
    return this.pixelRatio;
  }

  /**
   * Override the pixel ratio, capped at `RENDERER.maxPixelRatio`.
   * Immediately applies to the renderer if it exists.
   */
  setPixelRatio(ratio: number): void {
    this.pixelRatio = Math.min(ratio, RENDERER.maxPixelRatio);
    if (this.renderer) {
      this.renderer.setPixelRatio(this.pixelRatio);
    }
  }

  /**
   * Resize the renderer to match the given dimensions.
   * @param width  - New width in CSS pixels.
   * @param height - New height in CSS pixels.
   */
  resize(width: number, height: number): void {
    if (!this.renderer) return;
    this.renderer.setSize(width, height, false);
  }

  /** Clean up the renderer, remove the canvas from the DOM, and free GPU resources. */
  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(
          this.renderer.domElement,
        );
      }
      this.renderer = null;
    }
    this.hasEmittedReady = false;
  }
}