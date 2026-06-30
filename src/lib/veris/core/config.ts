/**
 * VerisVisuals — Global Configuration
 * =====================================
 * Single source of truth for all engine constants.
 * Separated from implementation logic per coding standards.
 *
 * @module config
 */

/* ─── Debug ──────────────────────────────────────────────────────────────────── */

/** When true, overlays FPS / draw calls / triangles / memory / camera position. */
export const DEBUG = false;

/* ─── Renderer ───────────────────────────────────────────────────────────────── */

export const RENDERER = {
  /** WebGLRenderer options */
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance' as WebGLPowerPreference,
  stencil: false,
  depth: true,

  /** Tone mapping */
  toneMapping: 4 as const, /* THREE.ACESFilmicToneMapping = 4 */
  exposure: 1.15,
  outputColorSpace: 3001 as const, /* THREE.SRGBColorSpace = 3001 */

  /** Shadows */
  shadowMap: true,
  shadowMapType: 2 as const, /* THREE.PCFSoftShadowMap = 2 */

  /** Pixel ratio cap */
  maxPixelRatio: 2,
} as const;

/* ─── Camera ─────────────────────────────────────────────────────────────────── */

export const CAMERA = {
  fov: 35,
  near: 0.1,
  far: 500,
  initialPosition: { x: 0, y: 1.2, z: 8 },
  lookAt: { x: 0, y: 1, z: 0 },

  /** Lissajous continuous breathing drift */
  lissajous: {
    xAmplitude: 0.18,
    xFrequency: 0.35,
    xPhase: Math.PI / 2,
    yAmplitude: 0.10,
    yFrequency: 0.52,
    zAmplitude: 0.08,
    zFrequency: 0.28,
  },

  /** Mouse-driven parallax */
  mouse: {
    xMultiplier: 0.35,
    yMultiplier: 0.20,
    lerpFactor: 0.06, /* Critically damped interpolation */
  },
} as const;

/* ─── Scene ──────────────────────────────────────────────────────────────────── */

export const SCENE = {
  background: 0x050505,
  fogType: 'exponential' as const,
  fogDensity: 0.015,
  fogColor: 0x050505,
} as const;

/* ─── Lighting ───────────────────────────────────────────────────────────────── */

export const LIGHTS = {
  key: {
    position: { x: -5, y: 4, z: 2 },
    intensity: 1100,
    color: 0xffffff,
    distance: 0,
    decay: 2,
  },
  fill: {
    position: { x: 5, y: 3, z: 4 },
    intensity: 700,
    color: 0xffffff,
    distance: 0,
    decay: 2,
  },
  backRim: {
    position: { x: 0, y: 8, z: -6 },
    intensity: 900,
    color: 0xffffff,
    distance: 0,
    decay: 2,
  },
  ambient: {
    intensity: 0.18,
    color: 0xffffff,
  },
} as const;

/* ─── Glass Material ─────────────────────────────────────────────────────────── */

export const GLASS_MATERIAL = {
  /** Physical properties */
  transmission: 1.0,
  ior: 1.52,
  thickness: 1.8,
  reflectivity: 0.92,
  clearcoat: 1.0,
  clearcoatRoughness: 0.03,
  metalness: 0,

  /** Theme-dependent */
  dark: {
    roughness: 0.08,
  },
  light: {
    roughness: 0.02,
  },
} as const;

/* ─── Themes ─────────────────────────────────────────────────────────────────── */

export const THEMES = {
  studio: {
    name: 'studio' as const,
    label: 'Studio Ambient',
    background: 0x050505,
    foreground: 0xf5f5f5,
    fogColor: 0x050505,
    glassRoughness: GLASS_MATERIAL.dark.roughness,
    exposure: 1.15,
    lightIntensityMultiplier: 1.0,
    bloomStrength: 0.3,
  },
  gallery: {
    name: 'gallery' as const,
    label: 'Gallery Day',
    background: 0xf9f9f9,
    foreground: 0x111111,
    fogColor: 0xe8e8e8,
    glassRoughness: GLASS_MATERIAL.light.roughness,
    exposure: 1.3,
    lightIntensityMultiplier: 0.7,
    bloomStrength: 0.1,
  },
  /** Duration in milliseconds for smooth theme interpolation */
  transitionDuration: 1500,
} as const;

/* ─── Performance ────────────────────────────────────────────────────────────── */

export const PERFORMANCE = {
  targetFPS: 60,
  adaptiveThreshold: 45,
  /** Steps taken when FPS drops below threshold */
  adaptiveSteps: [
    { action: 'reduceBloom', threshold: 45 },
    { action: 'reducePixelRatio', threshold: 35 },
    { action: 'reduceDOF', threshold: 25 },
  ] as const,
} as const;

/* ─── Scroll ─────────────────────────────────────────────────────────────────── */

export const SCROLL = {
  /** Normalized output range */
  min: 0,
  max: 1,
  /** Damping for trackpad / wheel smoothing */
  damping: 0.08,
} as const;

/* ─── Particles ──────────────────────────────────────────────────────────────── */

export const PARTICLES = {
  count: 400,
  size: 0.025,
  sizeAttenuation: true,
  blending: 1 as const, /* THREE.AdditiveBlending */
  depthWrite: false,
  opacity: 0.35,
  spreadX: 25,
  spreadY: 12,
  spreadZ: 15,
} as const;