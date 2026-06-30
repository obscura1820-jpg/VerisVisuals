/**
 * VerisVisuals — App Controller / Orchestrator
 * ================================================
 * Main entry point for the 3D WebGL experience.
 * Creates and wires all subsystems in dependency order, manages the
 * animation loop, and routes events between modules.
 *
 * Subsystem creation order:
 *   1. EventBus (no deps)
 *   2. VerisRenderer (eventBus)
 *   3. VerisScene (eventBus)
 *   4. VerisCamera (eventBus)
 *   5. VerisLights (scene, eventBus)
 *   6. VerisMaterials (eventBus)
 *   7. AssetManager (eventBus)
 *   8. MouseController (container, eventBus)
 *   9. ScrollController (container, eventBus)
 *  10. TimelineManager (eventBus)
 *  11. AudioManager (no deps)
 *  12. ThemeManager (eventBus)
 *  13. PerformanceMonitor (eventBus)
 *
 * @module app
 */

import * as THREE from 'three';
import { EventBus, VerisEvent } from './event-bus';
import { CAMERA, SCENE, RENDERER } from './config';
import { now } from './utils';

// Core 3D modules (built by parallel agent)
import { VerisRenderer } from './renderer';
import { VerisScene } from './scene';
import { VerisCamera } from './camera';
import { VerisLights } from './lights';
import { VerisMaterials } from './materials';

// System modules (this task)
import { AssetManager } from './loader';
import { MouseController } from './controls';
import { ScrollController } from './scroll';
import { TimelineManager, TimelineState } from './timeline';
import { AudioManager } from './audio';
import { ThemeManager } from './themes';
import { PerformanceMonitor } from './performance';

/* ─── Camera Targets per Section ────────────────────────────────────────────── */

/** Camera position/lookAt targets for each timeline state. */
const SECTION_CAMERA_TARGETS: Record<
  string,
  { position: { x: number; y: number; z: number }; lookAt: { x: number; y: number; z: number } }
> = {
  [TimelineState.PRELOADER]: {
    position: { x: 0, y: 0, z: 15 },
    lookAt: { x: 0, y: 0, z: 0 },
  },
  [TimelineState.HERO]: {
    position: { x: 0, y: 1.2, z: 8 },
    lookAt: { x: 0, y: 1, z: 0 },
  },
  [TimelineState.ARCHIVE]: {
    position: { x: 0, y: 1.5, z: 6 },
    lookAt: { x: 0, y: 1.2, z: -2 },
  },
  [TimelineState.DETAIL]: {
    position: { x: 2, y: 1.3, z: 4 },
    lookAt: { x: 0, y: 1, z: 0 },
  },
  [TimelineState.CONTACT]: {
    position: { x: 0, y: 2, z: 5 },
    lookAt: { x: 0, y: 0.5, z: 0 },
  },
};

export class VerisApp {
  private readonly container: HTMLElement;

  /* ─── Subsystems ──────────────────────────────────────────────────────────── */

  private eventBus!: EventBus;
  private renderer!: VerisRenderer;
  private scene!: VerisScene;
  private camera!: VerisCamera;
  private lights!: VerisLights;
  private materials!: VerisMaterials;
  private assetManager!: AssetManager;
  private mouseController!: MouseController;
  private scrollController!: ScrollController;
  private timelineManager!: TimelineManager;
  private audioManager!: AudioManager;
  private themeManager!: ThemeManager;
  private performanceMonitor!: PerformanceMonitor;

  /* ─── Animation Loop ──────────────────────────────────────────────────────── */

  private animFrameId = 0;
  private disposed = false;
  private lastTime = 0;

  /* ─── Event Unsubscribes ──────────────────────────────────────────────────── */

  private unsubs: Array<() => void> = [];
  private audioInitBound = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Initialize all subsystems.
   * Creates the 3D scene, loads assets, and wires events.
   * @returns Resolves when assets are loaded and the scene is ready.
   */
  async init(): Promise<void> {
    // 1. EventBus — no dependencies
    this.eventBus = new EventBus();

    // 2. Renderer
    this.renderer = new VerisRenderer(this.container, this.eventBus);
    this.renderer.init();

    // 3. Scene
    this.scene = new VerisScene(this.eventBus);
    const threeScene = this.scene.init();

    // 4. Camera
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new VerisCamera(this.eventBus);
    this.camera.init(w, h);

    // 5. Lights
    this.lights = new VerisLights(threeScene, this.eventBus);
    this.lights.init();

    // 6. Materials
    this.materials = new VerisMaterials(this.eventBus);

    // 7. Add particles to scene
    const particles = this.scene.createParticles();
    threeScene.add(particles);

    // 8. Asset Manager
    this.assetManager = new AssetManager(this.eventBus);
    await this.assetManager.load();

    // 9. Controls
    this.mouseController = new MouseController(this.container, this.eventBus);
    this.mouseController.init();

    // 10. Scroll
    this.scrollController = new ScrollController(this.container, this.eventBus);
    this.scrollController.init();

    // 11. Timeline
    this.timelineManager = new TimelineManager(this.eventBus);
    this.timelineManager.init();

    // 12. Audio (graph only, initialized on first user interaction)
    this.audioManager = new AudioManager();
    this.initAudioOnInteraction();

    // 13. Themes
    this.themeManager = new ThemeManager(this.eventBus);
    this.themeManager.init(true); // Start dark

    // 14. Performance
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);
    this.performanceMonitor.init(this.renderer.getRenderer());

    // Wire events
    this.wireEvents();

    // Initial scene setup
    this.scene.setBackground(SCENE.background);
    this.scene.setFogColor(SCENE.fogColor);
    this.scene.setFogDensity(SCENE.fogDensity);

    // Set initial camera position for PRELOADER state
    const preloaderTarget = SECTION_CAMERA_TARGETS[TimelineState.PRELOADER];
    this.camera.setPositionTarget(
      preloaderTarget.position.x,
      preloaderTarget.position.y,
      preloaderTarget.position.z,
    );
    this.camera.setLookAt(
      preloaderTarget.lookAt.x,
      preloaderTarget.lookAt.y,
      preloaderTarget.lookAt.z,
    );

    // Emit RenderReady
    this.eventBus.emit(VerisEvent.RenderReady);
  }

  /**
   * Start the render loop.
   * Uses requestAnimationFrame with a bound arrow function for reliable cancellation.
   */
  start(): void {
    if (this.disposed) return;
    this.lastTime = now();
    this.animate();
  }

  /** Stop the render loop. */
  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  /* ─── Public Accessors for React Overlay ──────────────────────────────────── */

  /** Get the event bus for React components to subscribe. */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /** Get the theme manager for the theme toggle button. */
  getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  /** Get the timeline manager for section indicators. */
  getTimelineManager(): TimelineManager {
    return this.timelineManager;
  }

  /** Get the audio manager for interaction-triggered init. */
  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  /** Force a specific theme from the React overlay. */
  setTheme(isDark: boolean): void {
    this.themeManager.setTheme(isDark);
    this.onThemeChanged();
  }

  /**
   * Dispose ALL subsystems in reverse dependency order.
   * Cancels animation frame and removes all event listeners.
   */
  dispose(): void {
    this.disposed = true;
    this.stop();

    // Unsubscribe all event handlers
    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs = [];

    // Dispose in reverse creation order
    this.performanceMonitor.dispose();
    this.themeManager.dispose();
    this.audioManager.dispose();
    this.timelineManager.dispose();
    this.scrollController.dispose();
    this.mouseController.dispose();
    this.assetManager.dispose();
    this.materials.dispose();
    this.lights.dispose();
    this.camera.dispose();
    this.scene.dispose();
    this.renderer.dispose();
    this.eventBus.clear();
  }

  /* ─── Animation Loop ──────────────────────────────────────────────────────── */

  /**
   * Main animation loop. Bound as an arrow function for stable reference.
   * NEVER allocates memory inside this loop.
   */
  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const currentTime = now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Prevent huge delta spikes (e.g. tab was backgrounded)
    const dt = deltaTime > 0.1 ? 0.016 : deltaTime;
    const elapsed = currentTime;

    // 1. Update Mouse Controller → get normalized position + velocity
    const mouseState = this.mouseController.update();

    // 2. Update Scroll Controller → get damped 0–1 value
    const scrollValue = this.scrollController.update();

    // 3. Update Timeline with scroll value
    this.timelineManager.setProgress(scrollValue);

    // 4. Update Camera with mouse state and elapsed time
    this.camera.update(dt, elapsed, mouseState.x, mouseState.y);

    // 5. Update Particles
    this.scene.updateParticles(dt, elapsed);

    // 6. Update Lights
    this.lights.update();

    // 7. Update Performance Monitor
    this.performanceMonitor.update();

    // 8. Render
    this.renderer.getRenderer().render(this.scene.getScene(), this.camera.getCamera());
  };

  /* ─── Event Wiring ────────────────────────────────────────────────────────── */

  /** Wire cross-module event subscriptions. */
  private wireEvents(): void {
    // AssetsLoaded → advance from PRELOADER to HERO
    this.unsubs.push(
      this.eventBus.on(VerisEvent.AssetsLoaded, () => {
        this.timelineManager.goto(TimelineState.HERO);
      }),
    );

    // SectionChanged → update camera targets
    this.unsubs.push(
      this.eventBus.on(VerisEvent.SectionChanged, (payload: unknown) => {
        const { to } = payload as { from: string; to: string };
        this.onSectionChanged(to);
      }),
    );

    // ThemeChanged → update scene, materials, lights
    this.unsubs.push(
      this.eventBus.on(VerisEvent.ThemeChanged, () => {
        this.onThemeChanged();
      }),
    );

    // Resize → update renderer and camera
    this.unsubs.push(
      this.eventBus.on(VerisEvent.Resize, () => {
        this.handleResize();
      }),
    );

    // Listen for window resize natively (since React may not handle it)
    const handleWindowResize = (): void => {
      this.handleResize();
    };
    window.addEventListener('resize', handleWindowResize);
    this.unsubs.push(() => window.removeEventListener('resize', handleWindowResize));

    // QualityChanged → adapt renderer pixel ratio
    this.unsubs.push(
      this.eventBus.on(VerisEvent.QualityChanged, (payload: unknown) => {
        const { level } = payload as { level: number };
        this.onQualityChanged(level);
      }),
    );
  }

  /* ─── Event Handlers ──────────────────────────────────────────────────────── */

  /**
   * Handle a section change — update camera position target.
   */
  private onSectionChanged(toState: string): void {
    const target = SECTION_CAMERA_TARGETS[toState];
    if (!target) return;

    this.camera.setPositionTarget(
      target.position.x,
      target.position.y,
      target.position.z,
    );
    this.camera.setLookAt(
      target.lookAt.x,
      target.lookAt.y,
      target.lookAt.z,
    );
  }

  /**
   * Handle a theme change — propagate to scene, materials, and lights.
   */
  private onThemeChanged(): void {
    const lerpState = this.themeManager.getLerpState();
    const isDark = this.themeManager.isDark();

    // Update scene background and fog
    this.scene.setBackground(lerpState.background.getHex());
    this.scene.setFogColor(lerpState.fogColor.getHex());

    // Update materials
    this.materials.updateForTheme(isDark);

    // Update light intensity
    this.lights.setIntensityMultiplier(lerpState.lightIntensityMultiplier);

    // Update particle color based on theme
    if (isDark) {
      this.scene.setParticleColor(0xffffff);
      this.scene.setParticleOpacity(0.35);
    } else {
      this.scene.setParticleColor(0x333333);
      this.scene.setParticleOpacity(0.2);
    }
  }

  /**
   * Handle window/container resize.
   */
  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    if (w === 0 || h === 0) return;

    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  }

  /**
   * Handle adaptive quality change.
   */
  private onQualityChanged(level: number): void {
    const currentRatio = this.renderer.getPixelRatio();

    switch (level) {
      case 0:
        // Full quality — restore to device pixel ratio (capped)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER.maxPixelRatio));
        break;
      case 1:
        // Reduce bloom (handled by post-processing when added)
        // For now, keep pixel ratio
        break;
      case 2:
        // Reduce pixel ratio
        this.renderer.setPixelRatio(Math.min(currentRatio * 0.75, RENDERER.maxPixelRatio));
        break;
      case 3:
        // Minimal — lowest pixel ratio
        this.renderer.setPixelRatio(1);
        break;
    }
  }

  /**
   * Set up audio initialization on first user interaction.
   * Uses a one-time listener pattern — fires once, then removes itself.
   */
  private initAudioOnInteraction(): void {
    if (this.audioInitBound) return;
    this.audioInitBound = true;

    const initHandler = (): void => {
      this.audioManager.init();
      cleanup();
    };

    const cleanup = (): void => {
      window.removeEventListener('pointerdown', initHandler);
      window.removeEventListener('keydown', initHandler);
      window.removeEventListener('touchstart', initHandler);
    };

    window.addEventListener('pointerdown', initHandler, { once: true });
    window.addEventListener('keydown', initHandler, { once: true });
    window.addEventListener('touchstart', initHandler, { once: true });
  }
}