"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VerisApp } from "@/lib/veris/core/app";
import { VerisEvent } from "@/lib/veris/core/event-bus";
import { TimelineState } from "@/lib/veris/core/timeline";
import { DEBUG } from "@/lib/veris/core/config";

/* ═══════════════════════════════════════════════════════════════════════════════
   ODOMETER COUNTER
   ═══════════════════════════════════════════════════════════════════════════════ */

function OdometerDigit({ digit }: { digit: number }) {
  return (
    <span className="odometer-digit" aria-hidden="true">
      <span
        className="odometer-digit-inner"
        style={{ transform: `translateY(-${digit * 10}%)` }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </span>
    </span>
  );
}

function OdometerCounter({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const hundreds = Math.floor(pct / 100);
  const tens = Math.floor((pct % 100) / 10);
  const ones = pct % 10;

  return (
    <span
      className="font-display inline-flex items-baseline"
      style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
      aria-label={`${pct}%`}
      role="status"
    >
      <OdometerDigit digit={hundreds} />
      <OdometerDigit digit={tens} />
      <OdometerDigit digit={ones} />
      <span
        style={{
          fontSize: "0.5em",
          marginLeft: "0.15em",
          opacity: 0.6,
          fontWeight: 400,
          fontFamily: "var(--font-inter)",
          letterSpacing: "0.1em",
        }}
      >
        %
      </span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEBUG OVERLAY — PRD 2 requirement
   ═══════════════════════════════════════════════════════════════════════════════ */

function DebugOverlay({ appRef }: { appRef: React.RefObject<VerisApp | null> }) {
  const [stats, setStats] = useState<{
    fps: number;
    drawCalls: number;
    triangles: number;
    memory: { geometry: number; textures: number };
    qualityLevel: number;
    camera: { x: number; y: number; z: number };
  } | null>(null);

  useEffect(() => {
    if (!DEBUG) return;
    const interval = setInterval(() => {
      if (appRef.current) {
        setStats(appRef.current.getPerformanceStats());
      }
    }, 250);
    return () => clearInterval(interval);
  }, [appRef]);

  if (!DEBUG || !stats) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "0.75rem",
        left: "0.75rem",
        zIndex: 200,
        fontFamily: "monospace",
        fontSize: "0.6rem",
        lineHeight: 1.6,
        color: "#00ff88",
        background: "rgba(0,0,0,0.6)",
        padding: "0.5rem 0.75rem",
        borderRadius: "4px",
        pointerEvents: "none",
        whiteSpace: "pre",
        opacity: 0.85,
      }}
    >
      {`FPS: ${stats.fps}
Draw: ${stats.drawCalls}
Tris: ${stats.triangles.toLocaleString()}
Geo: ${stats.memory.geometry}  Tex: ${stats.memory.textures}
Quality: ${stats.qualityLevel}
Cam: ${stats.camera.x.toFixed(2)}, ${stats.camera.y.toFixed(2)}, ${stats.camera.z.toFixed(2)}`}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT — Milestone 1
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════════
   GALLERY DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

const COMMERCIAL_WORKS = [
  {
    src: "/gallery/CH_F0033.jpg",
    alt: "White JRL grooming tools arranged on a minimalist gray pedestal",
    span: "full",
  },
  {
    src: "/gallery/CH_F0045.jpg",
    alt: "JRL clippers and shaver on a white pedestal, soft gray background",
    span: "half",
  },
  {
    src: "/gallery/CH_F0045-1.png",
    alt: "JRL grooming tools on light gray pedestal, warm beige background",
    span: "half",
  },
  {
    src: "/gallery/CH_F5208.jpg",
    alt: "Two black JRL hair clippers on a matte black background",
    span: "half",
  },
  {
    src: "/gallery/CH_F6290.jpg",
    alt: "Two sleek black hair dryers against a dark gradient background",
    span: "half",
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════════
   LIGHTBOX
   ═══════════════════════════════════════════════════════════════════════════════ */

function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: readonly { src: string; alt: string }[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];
  const count = images.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="veris-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${count}`}
    >
      <div className="veris-lightbox-backdrop" onClick={onClose} />
      <button
        className="veris-lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <line x1="2" y1="2" x2="14" y2="14" />
          <line x1="14" y1="2" x2="2" y2="14" />
        </svg>
      </button>
      <button
        className="veris-lightbox-nav veris-lightbox-prev"
        onClick={onPrev}
        aria-label="Previous image"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
          <polyline points="12,4 6,10 12,16" />
        </svg>
      </button>
      <button
        className="veris-lightbox-nav veris-lightbox-next"
        onClick={onNext}
        aria-label="Next image"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1">
          <polyline points="8,4 14,10 8,16" />
        </svg>
      </button>
      <div className="veris-lightbox-content">
        <img
          src={img.src}
          alt={img.alt}
          className="veris-lightbox-img"
          draggable={false}
        />
      </div>
      <div className="veris-lightbox-counter">
        {String(index + 1).padStart(2, "0")} &mdash; {String(count).padStart(2, "0")}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT — Milestone 1
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  /* ── State ──────────────────────────────────────────────────────────────────── */
  const [loadProgress, setLoadProgress] = useState(0);
  const [preloaderExiting, setPreloaderExiting] = useState(false);
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const [currentSection, setCurrentSection] = useState<string>(
    TimelineState.PRELOADER,
  );
  const [isDark, setIsDark] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* ── Refs ───────────────────────────────────────────────────────────────────── */
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<VerisApp | null>(null);

  /* ── Initialize the engine + subscribe to events atomically ──────────────────── */
  useEffect(() => {
    document.body.classList.add("no-scroll");

    const container = canvasContainerRef.current;
    if (!container) return;

    let mounted = true;
    const app = new VerisApp(container);
    appRef.current = app;

    // Subscribe BEFORE init so we don't miss any events
    const bus = app.getEventBus();

    const unsubProgress = bus.on(VerisEvent.LoadProgress, (payload: unknown) => {
      const { progress } = payload as { progress: number };
      if (mounted) setLoadProgress(progress);
    });

    const unsubLoaded = bus.on(VerisEvent.AssetsLoaded, () => {
      if (!mounted) return;
      setTimeout(() => {
        if (!mounted) return;
        setPreloaderExiting(true);
        setTimeout(() => {
          if (!mounted) return;
          setPreloaderComplete(true);
          document.body.classList.remove("no-scroll");
        }, 1400);
      }, 300);
    });

    const unsubSection = bus.on(
      VerisEvent.SectionChanged,
      (payload: unknown) => {
        const { to } = payload as { from: string; to: string };
        if (mounted) setCurrentSection(to);
      },
    );

    const unsubTheme = bus.on(VerisEvent.ThemeChanged, () => {
      if (mounted) {
        try { setIsDark(app.getThemeManager().isDark()); } catch { /* not yet init'd */ }
      }
    });

    // Now initialize and start
    app
      .init()
      .then(() => {
        if (!mounted) return;
        app.start();
      })
      .catch((err) => {
        console.error("[VerisVisuals] Init failed:", err);
      });

    return () => {
      mounted = false;
      unsubProgress();
      unsubLoaded();
      unsubSection();
      unsubTheme();
      app.dispose();
      appRef.current = null;
    };
  }, []);

  /* ── Theme toggle ───────────────────────────────────────────────────────────── */
  const toggleTheme = useCallback(() => {
    const app = appRef.current;
    if (!app) return;
    const next = !app.getThemeManager().isDark();
    app.setTheme(next);
    document.body.classList.toggle("veris-light", !next);
  }, []);

  /* ── Section visibility ─────────────────────────────────────────────────────── */
  const showHero = preloaderComplete && currentSection === TimelineState.HERO;
  const showArchive =
    preloaderComplete && currentSection === TimelineState.ARCHIVE;
  const showDetail =
    preloaderComplete && currentSection === TimelineState.DETAIL;
  const showContact =
    preloaderComplete && currentSection === TimelineState.CONTACT;

  /* ── Lightbox controls ─────────────────────────────────────────────────────── */
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null ? (i - 1 + COMMERCIAL_WORKS.length) % COMMERCIAL_WORKS.length : null,
      ),
    [],
  );
  const nextImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null ? (i + 1) % COMMERCIAL_WORKS.length : null,
      ),
    [],
  );



  /* ═══════════════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Three.js Canvas Container (fixed background) ──────────────────────── */}
      <div
        ref={canvasContainerRef}
        className="veris-canvas-container"
        aria-hidden="true"
      />

      {/* ── Debug Overlay (visible only when DEBUG=true in config) ──────────── */}
      <DebugOverlay appRef={appRef} />

      {/* ── Preloader Overlay ─────────────────────────────────────────────────── */}
      <div
        className={`veris-preloader ${preloaderExiting ? "v-entering" : ""}`}
        role="progressbar"
        aria-valuenow={Math.round(loadProgress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading experience"
      >
        <div
          className="font-display"
          style={{
            fontSize: "clamp(0.7rem, 1.5vw, 1rem)",
            letterSpacing: "0.35em",
            opacity: 0.4,
            marginBottom: "3rem",
          }}
        >
          VERISVISUALS
        </div>
        <OdometerCounter value={loadProgress} />
      </div>

      {/* ── Section: HERO ─────────────────────────────────────────────────────── */}
      <div
        className="veris-phase-overlay"
        style={{
          opacity: showHero ? 1 : 0,
          pointerEvents: showHero ? "auto" : "none",
        }}
        role="region"
        aria-label="Hero"
      >
        <div className="veris-wordmark">
          <span className="v-letter">VERIS</span>
          <span className="v-letter" style={{ opacity: 0.7 }}>
            VISUALS
          </span>
        </div>
        <p className="veris-tagline">Photography beyond documentation.</p>
        <div className="veris-hero-profile">
          <div className="veris-profile-ring">
            <img
              src="/salim-shaikh.png"
              alt="Salim Shaikh — Photographer, Mumbai"
              className="veris-profile-img"
              draggable={false}
            />
          </div>
          <div className="veris-profile-info">
            <span className="font-ui veris-profile-name">Salim Shaikh</span>
            <span className="font-ui veris-profile-location">Mumbai, India</span>
          </div>
        </div>
      </div>

      {/* ── Section: ARCHIVE — Commercial Gallery ────────────────────────────── */}
      <div
        className="veris-phase-overlay veris-phase-overlay--gallery"
        style={{
          opacity: showArchive ? 1 : 0,
          pointerEvents: showArchive ? "auto" : "none",
        }}
        role="region"
        aria-label="Commercial Gallery"
      >
        <header className="veris-gallery-header">
          <div className="font-ui" style={{ fontSize: "0.55rem", opacity: 0.3, letterSpacing: "0.4em" }}>
            Commercial
          </div>
          <div className="font-display" style={{ fontSize: "clamp(1rem, 2.5vw, 1.6rem)", opacity: 0.2, marginTop: "0.5rem" }}>
            Product &amp; Brand Photography
          </div>
        </header>

        <div className="veris-gallery-grid">
          {COMMERCIAL_WORKS.map((work, i) => (
            <button
              key={work.src}
              className={`veris-gallery-item ${work.span === "full" ? "veris-gallery-item--full" : ""}`}
              onClick={() => setLightboxIndex(i)}
              aria-label={`View: ${work.alt}`}
            >
              <img
                src={work.src}
                alt={work.alt}
                loading="lazy"
                draggable={false}
              />
              <div className="veris-gallery-item-overlay">
                <span className="veris-gallery-item-counter">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="veris-gallery-footer">
          <span className="font-ui" style={{ fontSize: "0.5rem", opacity: 0.15, letterSpacing: "0.3em" }}>
            {COMMERCIAL_WORKS.length} Works &middot; JRL
          </span>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {showArchive && lightboxIndex !== null && (
        <Lightbox
          images={COMMERCIAL_WORKS}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}

      {/* ── Section: DETAIL (empty — Milestone 3) ────────────────────────────── */}
      <div
        className="veris-phase-overlay"
        style={{
          opacity: showDetail ? 1 : 0,
          pointerEvents: showDetail ? "auto" : "none",
        }}
        role="region"
        aria-label="Detail"
      >
        <div
          className="font-ui"
          style={{ fontSize: "0.55rem", opacity: 0.3, letterSpacing: "0.4em" }}
        >
          Selected Works
        </div>
        <div
          className="font-display"
          style={{
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            opacity: 0.15,
            marginTop: "1rem",
          }}
        >
          Coming Soon
        </div>
      </div>

      {/* ── Section: CONTACT (empty — Milestone 4) ──────────────────────────── */}
      <div
        className="veris-phase-overlay"
        style={{
          opacity: showContact ? 1 : 0,
          pointerEvents: showContact ? "auto" : "none",
        }}
        role="region"
        aria-label="Contact"
      >
        <div
          className="font-ui"
          style={{ fontSize: "0.55rem", opacity: 0.3, letterSpacing: "0.4em" }}
        >
          Commission
        </div>
        <div
          className="font-display"
          style={{
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            opacity: 0.15,
            marginTop: "1rem",
          }}
        >
          Coming Soon
        </div>
      </div>

      {/* ── Theme Toggle ──────────────────────────────────────────────────────── */}
      {preloaderComplete && (
        <button
          className="veris-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${isDark ? "Gallery" : "Studio"} mode`}
        >
          {isDark ? "Studio" : "Gallery"}
        </button>
      )}

      {/* ── Scroll Hint ──────────────────────────────────────────────────────── */}
      {preloaderComplete && currentSection === TimelineState.HERO && (
        <div className="veris-scroll-hint visible" aria-hidden="true">
          Scroll to explore
        </div>
      )}

      {/* ── Section Navigation Dots ───────────────────────────────────────────── */}
      {preloaderComplete && (
        <nav className="veris-nav-dots" aria-label="Section navigation">
          {[
            { state: TimelineState.HERO, label: "Hero" },
            { state: TimelineState.ARCHIVE, label: "Archive" },
            { state: TimelineState.DETAIL, label: "Works" },
            { state: TimelineState.CONTACT, label: "Commission" },
          ].map(({ state, label }) => (
            <button
              key={state}
              className={`veris-nav-dot ${currentSection === state ? "active" : ""}`}
              aria-label={label}
              aria-current={currentSection === state ? "true" : undefined}
            />
          ))}
        </nav>
      )}
    </>
  );
}