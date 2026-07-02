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
   GALLERY DATA
   ═══════════════════════════════════════════════════════════════════════════════ */

type GalleryCategory = {
  id: string;
  label: string;
  subtitle: string;
  footer: string;
  works: readonly { src: string; alt: string; span: "full" | "half" }[];
};

const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    id: "commercial",
    label: "Commercial",
    subtitle: "Product & Brand Photography",
    footer: "5 Works \u00b7 JRL",
    works: [
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
    ],
  },
  {
    id: "weddings",
    label: "Weddings",
    subtitle: "Portrait & Ceremony",
    footer: "8 Works",
    works: [
      {
        src: "/gallery/104A0939.jpg",
        alt: "Newlywed couple in traditional Indian attire embracing outdoors in soft golden light",
        span: "full",
      },
      {
        src: "/gallery/104A0949.jpg",
        alt: "Wedding couple standing together in a sunlit open field with flowing veil",
        span: "half",
      },
      {
        src: "/gallery/104A0953.jpg",
        alt: "Groom kissing the bride\u2019s cheek in a sunlit field with intimate embrace",
        span: "half",
      },
      {
        src: "/gallery/104A0975.jpg",
        alt: "Bride placing a garland on the groom during a traditional Indian wedding ceremony",
        span: "full",
      },
      {
        src: "/gallery/104A1292.jpg",
        alt: "Wedding couple in traditional attire sharing a candid moment in golden outdoor light",
        span: "half",
      },
      {
        src: "/gallery/104A1310.jpg",
        alt: "Bride and groom framed by natural scenery during their outdoor wedding portrait session",
        span: "half",
      },
      {
        src: "/gallery/104A1312.jpg",
        alt: "Intimate portrait of the wedding couple in traditional dress with warm sunlight",
        span: "full",
      },
      {
        src: "/gallery/104A1336.jpg",
        alt: "Newlyweds walking together through an open landscape in their wedding finery",
        span: "full",
      },
    ],
  },
];

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
   MAIN PAGE COMPONENT
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
  const [activeCategory, setActiveCategory] = useState(GALLERY_CATEGORIES[0].id);

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
  const showAbout =
    preloaderComplete && currentSection === TimelineState.ABOUT;
  const showArchive =
    preloaderComplete && currentSection === TimelineState.ARCHIVE;
  const showDetail =
    preloaderComplete && currentSection === TimelineState.DETAIL;
  const showContact =
    preloaderComplete && currentSection === TimelineState.CONTACT;

  /* ── Derived gallery state ─────────────────────────────────────────────────── */
  const currentCategory = GALLERY_CATEGORIES.find((c) => c.id === activeCategory) ?? GALLERY_CATEGORIES[0];

  /* ── Lightbox controls ─────────────────────────────────────────────────────── */
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prevImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null
          ? (i - 1 + currentCategory.works.length) % currentCategory.works.length
          : null,
      ),
    [currentCategory.works.length],
  );
  const nextImage = useCallback(
    () =>
      setLightboxIndex((i) =>
        i !== null
          ? (i + 1) % currentCategory.works.length
          : null,
      ),
    [currentCategory.works.length],
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
        <img
          src="/logo-dark.png"
          alt=""
          className="veris-preloader-logo"
          draggable={false}
          aria-hidden="true"
        />
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

      {/* ── Section: ARCHIVE — Gallery with Category Tabs ─────────────────── */}
      <div
        className="veris-phase-overlay veris-phase-overlay--gallery"
        style={{
          opacity: showArchive ? 1 : 0,
          pointerEvents: showArchive ? "auto" : "none",
        }}
        role="region"
        aria-label="Gallery"
      >
        <header className="veris-gallery-header">
          <nav className="veris-gallery-tabs" aria-label="Gallery categories">
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`veris-gallery-tab ${activeCategory === cat.id ? "active" : ""}`}
                onClick={() => { setActiveCategory(cat.id); setLightboxIndex(null); }}
                aria-pressed={activeCategory === cat.id}
              >
                {cat.label}
              </button>
            ))}
          </nav>
          <div className="veris-gallery-subtitle">
            <span className="font-display" style={{ fontSize: "clamp(1rem, 2.5vw, 1.6rem)", opacity: 0.2 }}>
              {currentCategory.subtitle}
            </span>
          </div>
        </header>

        <div className="veris-gallery-grid" key={activeCategory}>
          {currentCategory.works.map((work, i) => (
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
            {currentCategory.footer}
          </span>
        </div>
      </div>

      {/* ── Lightbox ─────────────────────────────────────────────────────────── */}
      {showArchive && lightboxIndex !== null && (
        <Lightbox
          images={currentCategory.works}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}

      {/* ── Section: ABOUT ──────────────────────────────────────────────────── */}
      <div
        className="veris-phase-overlay"
        style={{
          opacity: showAbout ? 1 : 0,
          pointerEvents: showAbout ? "auto" : "none",
        }}
        role="region"
        aria-label="About"
      >
        <div className="veris-about-container">
          <div className="veris-about-photo-ring">
            <img
              src="/salim-shaikh.png"
              alt="Salim Shaikh"
              className="veris-about-photo"
              draggable={false}
            />
          </div>
          <div className="veris-about-content">
            <div className="veris-about-label font-ui">About</div>
            <h2 className="veris-about-name font-display">Salim Shaikh</h2>
            <div className="veris-about-location font-ui">Mumbai, India</div>
            <p className="veris-about-bio">
              Photographer and visual storyteller based in Mumbai. With a keen eye
              for light, texture, and human emotion, Salim crafts imagery that
              transcends documentation — capturing the quiet poetry in every frame.
              His work spans commercial branding, editorial portraits, and intimate
              wedding storytelling, each approached with the same devotion to
              authenticity and craft.
            </p>
            <div className="veris-about-specialties">
              {[
                "Commercial",
                "Weddings",
                "Portraits",
                "Editorial",
                "Product",
              ].map((s) => (
                <span key={s} className="veris-about-tag font-ui">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section: DETAIL — Selected Works ────────────────────────────────── */}
      <div
        className="veris-phase-overlay veris-phase-overlay--detail"
        style={{
          opacity: showDetail ? 1 : 0,
          pointerEvents: showDetail ? "auto" : "none",
        }}
        role="region"
        aria-label="Selected Works"
      >
        <header className="veris-detail-header">
          <div className="veris-detail-label font-ui">Selected Works</div>
          <h2
            className="veris-detail-title font-display"
            style={{
              fontSize: "clamp(1.2rem, 3vw, 2.2rem)",
              opacity: 0.3,
            }}
          >
            Curated Selection
          </h2>
        </header>
        <div className="veris-detail-grid">
          <article className="veris-detail-card">
            <div className="veris-detail-card-img">
              <img
                src="/gallery/CH_F0033.jpg"
                alt="JRL grooming tools product photography"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="veris-detail-card-info">
              <span className="veris-detail-card-category font-ui">
                Commercial
              </span>
              <h3 className="veris-detail-card-title font-display">
                JRL Grooming Tools
              </h3>
              <p className="veris-detail-card-desc">
                Minimalist product photography for premium grooming brand.
              </p>
            </div>
          </article>
          <article className="veris-detail-card">
            <div className="veris-detail-card-img">
              <img
                src="/gallery/104A0939.jpg"
                alt="Wedding couple in traditional Indian attire"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="veris-detail-card-info">
              <span className="veris-detail-card-category font-ui">
                Weddings
              </span>
              <h3 className="veris-detail-card-title font-display">
                Golden Hour Vows
              </h3>
              <p className="veris-detail-card-desc">
                Intimate wedding portrait captured in warm natural light.
              </p>
            </div>
          </article>
          <article className="veris-detail-card">
            <div className="veris-detail-card-img">
              <img
                src="/gallery/CH_F6290.jpg"
                alt="JRL hair dryers dark gradient background"
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className="veris-detail-card-info">
              <span className="veris-detail-card-category font-ui">
                Commercial
              </span>
              <h3 className="veris-detail-card-title font-display">
                Shadow & Form
              </h3>
              <p className="veris-detail-card-desc">
                Dark gradient study for premium hair dryer campaign.
              </p>
            </div>
          </article>
        </div>
        <div className="veris-detail-footer">
          <span
            className="font-ui"
            style={{
              fontSize: "0.5rem",
              opacity: 0.15,
              letterSpacing: "0.3em",
            }}
          >
            3 Selected Works
          </span>
        </div>
      </div>

      {/* ── Section: CONTACT — Commission Page ──────────────────────────────── */}
      <div
        className="veris-phase-overlay veris-phase-overlay--commission"
        style={{
          opacity: showContact ? 1 : 0,
          pointerEvents: showContact ? "auto" : "none",
        }}
        role="region"
        aria-label="Commission"
      >
        <div className="veris-commission-inner">
          {/* Header */}
          <header className="veris-commission-header">
            <div className="veris-commission-label font-ui">Commission</div>
            <h2 className="veris-commission-heading font-display">
              Let&apos;s Create
              <br />
              Together
            </h2>
            <p className="veris-commission-sub">
              Every project begins with a conversation.
              Fill in the details below and I&apos;ll get back to you.
            </p>
          </header>

          {/* Contact Form — placed first so it's immediately visible */}
          <form
            className="veris-form"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Commission inquiry"
          >
            <div className="veris-form-row">
              <div className="veris-form-group">
                <label className="veris-form-label font-ui" htmlFor="comm-name">
                  Name
                </label>
                <input
                  id="comm-name"
                  type="text"
                  className="veris-form-input"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className="veris-form-group">
                <label className="veris-form-label font-ui" htmlFor="comm-email">
                  Email
                </label>
                <input
                  id="comm-email"
                  type="email"
                  className="veris-form-input"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="veris-form-group">
              <label className="veris-form-label font-ui" htmlFor="comm-type">
                Project Type
              </label>
              <select id="comm-type" className="veris-form-select font-ui">
                <option value="" disabled>
                  Select a category
                </option>
                <option value="commercial">Commercial / Branding</option>
                <option value="wedding">Wedding</option>
                <option value="portrait">Portrait / Personal</option>
                <option value="editorial">Editorial</option>
                <option value="product">Product Photography</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="veris-form-group">
              <label className="veris-form-label font-ui" htmlFor="comm-msg">
                Message
              </label>
              <textarea
                id="comm-msg"
                className="veris-form-textarea"
                placeholder="Tell me about your project, timeline, and any references..."
                rows={4}
              />
            </div>
            <button type="submit" className="veris-form-submit font-ui">
              Send Inquiry
            </button>
          </form>

          {/* Services — informational, below the form */}
          <section className="veris-services" aria-label="Services">
            <div className="veris-services-title font-ui">Services</div>
            <div className="veris-services-grid">
              <div className="veris-service-card">
                <h3 className="veris-service-card-title font-display">
                  Commercial
                </h3>
                <p className="veris-service-card-desc">
                  Product, branding, and editorial photography for businesses.
                  Clean, intentional imagery that elevates your brand.
                </p>
              </div>
              <div className="veris-service-card">
                <h3 className="veris-service-card-title font-display">
                  Weddings
                </h3>
                <p className="veris-service-card-desc">
                  Documentary-style wedding coverage capturing authentic moments
                  and the quiet poetry of your celebration.
                </p>
              </div>
              <div className="veris-service-card">
                <h3 className="veris-service-card-title font-display">
                  Portraits
                </h3>
                <p className="veris-service-card-desc">
                  Personal and editorial portraits in studio or on location.
                  Focused on natural light and genuine expression.
                </p>
              </div>
            </div>
          </section>

          {/* Process */}
          <section className="veris-process" aria-label="Process">
            <div className="veris-process-title font-ui">Process</div>
            <div className="veris-process-steps">
              <div className="veris-process-step">
                <span className="veris-process-step-num font-display">01</span>
                <span className="veris-process-step-name font-ui">Inquiry</span>
                <p className="veris-process-step-desc">
                  Share your vision, timeline, and budget.
                </p>
              </div>
              <div className="veris-process-step">
                <span className="veris-process-step-num font-display">02</span>
                <span className="veris-process-step-name font-ui">Consult</span>
                <p className="veris-process-step-desc">
                  A call to align on creative direction, logistics, and deliverables.
                </p>
              </div>
              <div className="veris-process-step">
                <span className="veris-process-step-num font-display">03</span>
                <span className="veris-process-step-name font-ui">Shoot</span>
                <p className="veris-process-step-desc">
                  The session itself — focused, intentional, and collaborative.
                </p>
              </div>
              <div className="veris-process-step">
                <span className="veris-process-step-num font-display">04</span>
                <span className="veris-process-step-name font-ui">Deliver</span>
                <p className="veris-process-step-desc">
                  Curated, retouched gallery delivered within the agreed timeline.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Links */}
          <footer className="veris-commission-footer">
            <div className="veris-commission-links">
              <a
                href="mailto:hello@verisvisuals.com"
                className="veris-commission-link font-ui"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="22,4 12,13 2,4" />
                </svg>
                hello@verisvisuals.com
              </a>
              <a
                href="https://instagram.com/verisvisuals"
                target="_blank"
                rel="noopener noreferrer"
                className="veris-commission-link font-ui"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
                </svg>
                @verisvisuals
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                className="veris-commission-link font-ui"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                WhatsApp
              </a>
            </div>
            <div className="veris-commission-location font-ui">
              Based in Mumbai, India
            </div>
          </footer>
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
            { state: TimelineState.ABOUT, label: "About" },
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