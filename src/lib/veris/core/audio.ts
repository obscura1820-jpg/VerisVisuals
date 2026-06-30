/**
 * VerisVisuals — Audio Manager
 * ===============================
 * Lazy-initializes the Web Audio API graph on first user interaction.
 * Graph: AudioContext → DynamicsCompressor → MasterGain → Limiter → Destination
 * No sounds are played — the graph is built and ready for future use.
 * `init()` is idempotent and safe to call multiple times.
 *
 * @module audio
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: GainNode | null = null;
  private initialized = false;
  private disposed = false;

  constructor() {
    // AudioContext is NOT created here — deferred to first user interaction
  }

  /**
   * Initialize the audio graph. Called on first user interaction.
   * Idempotent — subsequent calls are no-ops.
   */
  init(): void {
    if (this.initialized || this.disposed) return;

    try {
      // Create the AudioContext (must happen after user gesture)
      this.audioContext = new AudioContext();

      // Resume if suspended (some browsers start suspended)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Dynamics Compressor: threshold -24dB, ratio 4, attack 0.003s, release 0.25s
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, 0);
      this.compressor.ratio.setValueAtTime(4, 0);
      this.compressor.attack.setValueAtTime(0.003, 0);
      this.compressor.release.setValueAtTime(0.25, 0);
      this.compressor.knee.setValueAtTime(30, 0);

      // Master Gain Node (default volume)
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.setValueAtTime(1.0, 0);

      // Limiter: a simple gain node at 0.9 to prevent clipping
      this.limiter = this.audioContext.createGain();
      this.limiter.gain.setValueAtTime(0.9, 0);

      // Connect the graph:
      // Source (future) → Compressor → MasterGain → Limiter → Destination
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.audioContext.destination);

      this.initialized = true;
    } catch {
      // Silently fail — audio is non-essential
      console.warn('[AudioManager] Failed to initialize AudioContext.');
    }
  }

  /** Get the master gain node for connecting sound sources. */
  getMasterGain(): GainNode | null {
    return this.masterGain;
  }

  /** Get the underlying AudioContext. */
  getContext(): AudioContext | null {
    return this.audioContext;
  }

  /** Whether the audio graph has been initialized. */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Close the AudioContext and disconnect all nodes. */
  dispose(): void {
    this.disposed = true;
    try {
      if (this.limiter) {
        this.limiter.disconnect();
      }
      if (this.masterGain) {
        this.masterGain.disconnect();
      }
      if (this.compressor) {
        this.compressor.disconnect();
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
      }
    } catch {
      // Ignore cleanup errors
    }
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.limiter = null;
    this.initialized = false;
  }
}