"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VerisApp } from "@/lib/veris/core/app";
import { VerisEvent } from "@/lib/veris/core/event-bus";
import { TimelineState } from "@/lib/veris/core/timeline";
import { easeInOutQuart } from "@/lib/veris/core/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   ODOMETER COUNTER
   Each digit eases individually — PRD requirement.
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
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const hundreds = Math.floor(clamped / 100);
  const tens = Math.floor((clamped % 100) / 10);
  const ones = clamped % 10;

  return (
    <span
      className="font-display inline-flex items-baseline"
      style={{ fontSize: "clamp(2rem, 6vw, 5rem)" }}
      aria-label={`${clamped}%`}
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
   MAIN PAGE COMPONENT — Milestone 1
   Preloader + immersive environment.
   No gallery. No contact form. Empty timeline sections.
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

  /* ── Refs ───────────────────────────────────────────────────────────────────── */
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<VerisApp | null>(null);

  /* ── Initialize the engine ──────────────────────────────────────────────────── */
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let mounted = true;
    const app = new VerisApp(container);
    appRef.current = app;

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
      app.dispose();
      appRef.current = null;
    };
  }, []);

  /* ── Subscribe to engine events ─────────────────────────────────────────────── */
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const bus = app.getEventBus();

    /* Loading progress from asset manager */
    const unsubProgress = bus.on(VerisEvent.LoadProgress, (payload: unknown) => {
      const { progress } = payload as { progress: number };
      setLoadProgress(progress);
    });

    /* Assets loaded → trigger preloader exit */
    const unsubLoaded = bus.on(VerisEvent.AssetsLoaded, () => {
      setTimeout(() => {
        setPreloaderExiting(true);
        setTimeout(() => {
          setPreloaderComplete(true);
          document.body.classList.remove("no-scroll");
        }, 1400);
      }, 300);
    });

    /* Section changes from timeline */
    const unsubSection = bus.on(
      VerisEvent.SectionChanged,
      (payload: unknown) => {
        const { to } = payload as { from: string; to: string };
        setCurrentSection(to);
      },
    );

    /* Theme changes */
    const unsubTheme = bus.on(VerisEvent.ThemeChanged, () => {
      setIsDark(app.getThemeManager().isDark());
    });

    return () => {
      unsubProgress();
      unsubLoaded();
      unsubSection();
      unsubTheme();
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

      {/* ── Preloader Overlay ─────────────────────────────────────────────────── */}
      <div
        className={`veris-preloader ${preloaderExiting ? "v-entering" : ""}`}
        role="progressbar"
        aria-valuenow={loadProgress}
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

      {/* ── Scroll Container (drives timeline via wheel events) ──────────────── */}
      <div
        style={{
          position: "relative",
          height: preloaderComplete ? "500vh" : "100vh",
          zIndex: 1,
          pointerEvents: "none",
        }}
        aria-hidden="true"
      />

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
        <div
          style={{
            position: "absolute",
            bottom: "3rem",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
          }}
        >
          <div
            className="font-ui"
            style={{ fontSize: "0.55rem", opacity: 0.25 }}
          >
            Salim Shaikh
          </div>
          <div
            className="font-ui"
            style={{ fontSize: "0.5rem", opacity: 0.15, marginTop: "0.3rem" }}
          >
            Mumbai, India
          </div>
        </div>
      </div>

      {/* ── Section: ARCHIVE (empty — Milestone 2) ───────────────────────────── */}
      <div
        className="veris-phase-overlay"
        style={{
          opacity: showArchive ? 1 : 0,
          pointerEvents: showArchive ? "auto" : "none",
        }}
        role="region"
        aria-label="Archive"
      >
        <div
          className="font-ui"
          style={{ fontSize: "0.55rem", opacity: 0.3, letterSpacing: "0.4em" }}
        >
          Archive
        </div>
        <div
          className="font-display"
          style={{
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            opacity: 0.15,
            marginTop: "1rem",
          }}
        >
          Editorial &middot; Weddings &middot; Portraits
        </div>
      </div>

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
    </>
  );
}