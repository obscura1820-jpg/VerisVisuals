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
import { CAMERA, SCENE, RENDERER, GLASS_MATERIAL } from './config';
import { now } from './utils';

// Core 3D modules
import { VerisRenderer } from './renderer';
import { VerisScene } from './scene';
import { VerisCamera } from './camera';
import { VerisLights } from './lights';
import { VerisMaterials } from './materials';

// System modules
import { AssetManager } from './loader';
import { MouseController } from './controls';
import { ScrollController } from './scroll';
import { TimelineManager, TimelineState } from './timeline';
import { AudioManager } from './audio';
import { ThemeManager } from './themes';
import { PerformanceMonitor } from './performance';

/* ─── Camera Targets per Section ────────────────────────────────────────────── */

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
  [TimelineState.ABOUT]: {
    position: { x: -0.5, y: 1.4, z: 7 },
    lookAt: { x: 0, y: 1.1, z: 0 },
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

  /* ─── Glass panels (hero visual) ──────────────────────────────────────────── */

  private glassPanels: THREE.Mesh[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    // Create EventBus immediately so consumers can subscribe before init()
    this.eventBus = new EventBus();
  }

  /**
   * Initialize all subsystems.
   * Creates the 3D scene, loads assets, and wires events.
   * @returns Resolves when assets are loaded and the scene is ready.
   */
  async init(): Promise<void> {
    // 1. EventBus — already created in constructor
    // this.eventBus is available

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

    // 8. Create glass panels for visual depth
    this.createGlassPanels(threeScene);

    // 9. Timeline — MUST be created before asset load so it can receive AssetsLoaded
    this.timelineManager = new TimelineManager(this.eventBus);
    this.timelineManager.init();

    // 10. Wire events — MUST be before asset load to catch AssetsLoaded
    this.wireEvents();

    // 11. Asset Manager
    this.assetManager = new AssetManager(this.eventBus);
    await this.assetManager.load();

    // 12. Controls
    this.mouseController = new MouseController(this.container, this.eventBus);
    this.mouseController.init();

    // 13. Scroll
    this.scrollController = new ScrollController(this.container, this.eventBus);
    this.scrollController.init();

    // 14. Audio (graph only, initialized on first user interaction)
    this.audioManager = new AudioManager();
    this.initAudioOnInteraction();

    // 15. Themes
    this.themeManager = new ThemeManager(this.eventBus);
    this.themeManager.init(true); // Start dark

    // 16. Performance
    this.performanceMonitor = new PerformanceMonitor(this.eventBus);
    this.performanceMonitor.init(this.renderer.getRenderer());

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
   */
  start(): void {
    if (this.disposed) return;
    this.lastTime = now();
    this.animate();

    // Enable scroll input after the preloader has fully faded.
    // React preloader flow: 300ms delay + 1400ms CSS animation = 1700ms.
    // We add a 300ms buffer for safety.
    setTimeout(() => {
      if (!this.disposed) {
        this.scrollController.enable();
      }
    }, 2000);
  }

  /** Stop the render loop. */
  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  /* ─── Public Accessors for React Overlay ──────────────────────────────────── */

  getEventBus(): EventBus { return this.eventBus; }
  getThemeManager(): ThemeManager { return this.themeManager; }
  getTimelineManager(): TimelineManager { return this.timelineManager; }
  getAudioManager(): AudioManager { return this.audioManager; }

  /** Force a specific theme from the React overlay. */
  setTheme(isDark: boolean): void {
    this.themeManager.setTheme(isDark);
    this.onThemeChanged();
  }

  /** Get performance stats for the debug overlay. */
  getPerformanceStats() {
    return {
      fps: Math.round(this.performanceMonitor.getFPS()),
      drawCalls: this.performanceMonitor.getDrawCalls(),
      triangles: this.performanceMonitor.getTriangles(),
      memory: this.performanceMonitor.getMemory(),
      qualityLevel: this.performanceMonitor.getQualityLevel(),
      camera: this.camera.getPosition(),
    };
  }

  /**
   * Dispose ALL subsystems in reverse dependency order.
   */
  dispose(): void {
    this.disposed = true;
    this.stop();

    for (const unsub of this.unsubs) {
      unsub();
    }
    this.unsubs = [];

    // Dispose glass panels
    for (const panel of this.glassPanels) {
      panel.geometry.dispose();
      if (panel.material instanceof THREE.Material) {
        panel.material.dispose();
      }
    }
    this.glassPanels = [];

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

  /* ─── Glass Panel Creation ───────────────────────────────────────────────── */

  private createGlassPanels(scene: THREE.Scene): void {
    const glassMat = this.materials.createGlassMaterial();

    // Create 5 floating glass panels at varying positions and rotations
    const panelConfigs = [
      { pos: [-3, 1.5, -2], rot: [0.15, 0.3, 0.05], scale: [2.5, 3.5, 0.08] },
      { pos: [3.5, 0.8, -1], rot: [-0.1, -0.4, 0.08], scale: [2, 2.8, 0.08] },
      { pos: [-1, 2.5, -3.5], rot: [0.2, 0.1, -0.05], scale: [3, 2, 0.08] },
      { pos: [2, 1.8, -4], rot: [-0.05, 0.5, 0.1], scale: [1.8, 3.2, 0.08] },
      { pos: [0, 0.5, -1.5], rot: [0.08, -0.2, 0.03], scale: [4, 2.5, 0.06] },
    ];

    for (const cfg of panelConfigs) {
      const geom = new THREE.PlaneGeometry(cfg.scale[0], cfg.scale[1]);
      const mesh = new THREE.Mesh(geom, glassMat);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      mesh.receiveShadow = true;
      scene.add(mesh);
      this.glassPanels.push(mesh);
    }
  }

  /* ─── Animation Loop ──────────────────────────────────────────────────────── */

  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const currentTime = now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const dt = deltaTime > 0.1 ? 0.016 : deltaTime;
    const elapsed = currentTime;

    // 1. Update Mouse Controller
    const mouseState = this.mouseController.update();

    // 2. Update Scroll Controller → get damped 0–1 global value
    const scrollValue = this.scrollController.update();

    // 3. Update Timeline with global scroll value
    this.timelineManager.setGlobalScroll(scrollValue);

    // 4. Update Camera
    this.camera.update(dt, elapsed, mouseState.x, mouseState.y);

    // 5. Rotate glass panels slowly
    this.updateGlassPanels(elapsed);

    // 6. Update Particles
    this.scene.updateParticles(dt, elapsed);

    // 7. Update Lights
    this.lights.update();

    // 8. Update Performance Monitor
    this.performanceMonitor.update();

    // 9. Render
    this.renderer.getRenderer().render(this.scene.getScene(), this.camera.getCamera());
  };

  /** Subtle glass panel rotation for living feel. */
  private updateGlassPanels(elapsed: number): void {
    for (let i = 0; i < this.glassPanels.length; i++) {
      const panel = this.glassPanels[i];
      const offset = i * 1.7;
      panel.rotation.y += Math.sin(elapsed * 0.15 + offset) * 0.00008;
      panel.rotation.x += Math.cos(elapsed * 0.12 + offset * 0.5) * 0.00005;
    }
  }

  /* ─── Event Wiring ────────────────────────────────────────────────────────── */

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

    // Window resize (native listener, since this is the primary resize source)
    const handleWindowResize = (): void => {
      this.eventBus.emit(VerisEvent.Resize);
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

  private onThemeChanged(): void {
    const lerpState = this.themeManager.getLerpState();
    const isDark = this.themeManager.isDark();

    // Update scene background and fog
    this.scene.setBackground(lerpState.background.getHex());
    this.scene.setFogColor(lerpState.fogColor.getHex());

    // Update renderer exposure
    this.renderer.getRenderer().toneMappingExposure = lerpState.exposure;

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

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    if (w === 0 || h === 0) return;

    this.renderer.resize(w, h);
    this.camera.resize(w, h);
  }

  private onQualityChanged(level: number): void {
    const currentRatio = this.renderer.getPixelRatio();

    switch (level) {
      case 0:
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER.maxPixelRatio));
        break;
      case 1:
        // Reduce bloom (handled by post-processing when added)
        break;
      case 2:
        this.renderer.setPixelRatio(Math.min(currentRatio * 0.75, RENDERER.maxPixelRatio));
        break;
      case 3:
        this.renderer.setPixelRatio(1);
        break;
    }
  }

  private initAudioOnInteraction(): void {
    if (this.audioInitBound) return;
    this.audioInitBound = true;

    const initHandler = (): void => {
      this.audioManager.init();
    };

    window.addEventListener('pointerdown', initHandler, { once: true });
    window.addEventListener('keydown', initHandler, { once: true });
    window.addEventListener('touchstart', initHandler, { once: true });
  }
}