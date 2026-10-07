'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';

/* ── layout helpers ── */
const LAYOUT_PATTERNS = [
  // Each pattern defines { w, h, x, y, speed, rotate } as percentages / multipliers
  // w/h as vw-based widths, x as %, y is auto-stacked
  { w: 38, speed: 0.15, offsetX: 5, rotate: -2.5 },
  { w: 26, speed: -0.25, offsetX: 58, rotate: 1.8 },
  { w: 30, speed: 0.35, offsetX: 32, rotate: -1.2 },
  { w: 22, speed: -0.15, offsetX: 8, rotate: 2.5 },
  { w: 34, speed: 0.28, offsetX: 52, rotate: -0.8 },
  { w: 28, speed: -0.32, offsetX: 18, rotate: 1.5 },
  { w: 40, speed: 0.2, offsetX: 42, rotate: -1.8 },
  { w: 24, speed: -0.22, offsetX: 68, rotate: 2.2 },
  { w: 32, speed: 0.3, offsetX: 2, rotate: -2.0 },
  { w: 26, speed: -0.18, offsetX: 48, rotate: 1.0 },
  { w: 36, speed: 0.25, offsetX: 22, rotate: -1.5 },
  { w: 20, speed: -0.28, offsetX: 72, rotate: 2.8 },
];

export default function GalleryPage() {
  const [passports, setPassports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [gsapReady, setGsapReady] = useState(false);
  const scatterRef = useRef(null);
  const photoRefs = useRef([]);
  const headerRef = useRef(null);

  /* ── data ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/passports');
        const data = await r.json();
        if (!cancelled && data.success && Array.isArray(data.passports)) {
          setPassports(data.passports);
        } else if (!cancelled) setErrored(true);
      } catch {
        if (!cancelled) setErrored(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen || selected ? 'hidden' : '';
  }, [menuOpen, selected]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setSelected(null); setFilterOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── filter logic ── */
  const cities = useMemo(() => {
    const counts = {};
    passports.forEach((p) => {
      const c = (p.city || 'Unknown').trim();
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [passports]);

  const filtered = useMemo(() => {
    let list = passports.slice();
    if (city !== 'all') list = list.filter((p) => (p.city || 'Unknown').trim() === city);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        (p.code || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.holder_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [passports, city, search]);

  const total = passports.length;
  const totalStr = String(total).padStart(2, '0');
  const openModal = useCallback((p) => setSelected(p), []);
  const closeModal = useCallback(() => setSelected(null), []);

  /* ── GSAP parallax ── */
  useEffect(() => {
    if (!gsapReady || loading || filtered.length === 0) return;
    if (typeof window === 'undefined' || !window.gsap || !window.ScrollTrigger) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    // Kill old triggers
    ScrollTrigger.getAll().forEach(t => t.kill());

    // Header parallax
    if (headerRef.current) {
      gsap.to(headerRef.current.querySelector('.gal-title'), {
        y: -60,
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
        },
      });
    }

    // Photo parallax — each photo gets its own speed
    photoRefs.current.forEach((el) => {
      if (!el) return;
      const speed = parseFloat(el.dataset.speed || 0);
      const rotate = parseFloat(el.dataset.rotate || 0);

      gsap.to(el, {
        y: speed * 300,
        rotation: rotate * 0.5,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        },
      });
    });

    // Stagger entrance
    gsap.fromTo(
      photoRefs.current.filter(Boolean),
      { opacity: 0, y: 80, scale: 0.92 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: scatterRef.current,
          start: 'top 85%',
        },
      }
    );

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, [gsapReady, loading, filtered]);

  return (
    <>
      {/* GSAP */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        strategy="afterInteractive"
        onLoad={() => {}}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"
        strategy="afterInteractive"
        onLoad={() => setGsapReady(true)}
      />

      <div className="spectrum-bar" />

      {/* NAV */}
      <nav>
        <div className="nav-logo" style={{ fontSize: '17px' }}>COLOROUT&#8482;</div>
        <div className="nav-links">
          <Link href="/#about">About</Link>
          <Link href="/#verify">Verify</Link>
          <Link href="/gallery" className="active" style={{ color: 'var(--fg)' }}>Gallery</Link>
          <Link href="/#benefits">Benefits</Link>
        </div>
        <button className="nav-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>MENU</button>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-header">
          <div className="nav-logo">ColorOut&#8482; <span className="nav-artist">by Patrick Cat</span></div>
          <button className="nav-menu-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>CLOSE</button>
        </div>
        <div className="mobile-menu-links">
          <Link href="/#about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/#verify" onClick={() => setMenuOpen(false)}>Verify</Link>
          <Link href="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
          <Link href="/#benefits" onClick={() => setMenuOpen(false)}>Benefits</Link>
        </div>
        <div className="mobile-menu-footer">
          <a href="https://www.instagram.com/patrickcat_art/" target="_blank" rel="noopener noreferrer">Instagram &#8599;</a>
          <span>NYC &middot; EST. 2020</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="gal-header" ref={headerRef}>
        <div className="gal-header-inner">
          <div className="gal-eyebrow">
            <span className="gal-eyebrow-line" />
            The Archive &middot; {totalStr} Pieces
          </div>
          <h1 className="gal-title">
            <span className="gal-title-thin">The</span> ColorOut<span className="gal-title-sup">&#8482;</span>{' '}
            <span className="gal-title-spectrum">Archive</span>
          </h1>
          <p className="gal-subtitle">
            Freehand chromatic tattoos by Patrick Cat. Each piece is authenticated,
            numbered, and recorded in the permanent ColorOut&#8482; registry.
          </p>
        </div>

        {/* Floating filter pill */}
        <button
          className="gal-filter-toggle"
          onClick={() => setFilterOpen(!filterOpen)}
          aria-expanded={filterOpen}
        >
          <span className="gal-filter-icon">&#9776;</span>
          Filter{city !== 'all' ? `: ${city}` : ''}{search ? ` · "${search}"` : ''}
          <span className="gal-filter-count">{filtered.length}</span>
        </button>
      </header>

      {/* FILTER DRAWER */}
      <div className={`gal-filter-drawer${filterOpen ? ' open' : ''}`}>
        <div className="gal-filter-body">
          <div className="gal-filter-section">
            <div className="gal-filter-label">Search</div>
            <input
              type="text"
              className="gal-search-input"
              placeholder="Code, city, or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="gal-filter-section">
            <div className="gal-filter-label">Location</div>
            <div className="gal-chips">
              <button
                className={`gal-chip${city === 'all' ? ' active' : ''}`}
                onClick={() => setCity('all')}
              >
                All <span>{total}</span>
              </button>
              {cities.map(([c, n]) => (
                <button
                  key={c}
                  className={`gal-chip${city === c ? ' active' : ''}`}
                  onClick={() => setCity(c)}
                >
                  {c} <span>{n}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="gal-filter-close" onClick={() => setFilterOpen(false)}>Done</button>
        </div>
      </div>

      {/* SCATTERED PHOTOS */}
      <section className="gal-scatter-wrap" ref={scatterRef}>
        {loading ? (
          <div className="gal-loading">
            <div className="gal-loading-bar" />
            <span>Loading archive...</span>
          </div>
        ) : errored ? (
          <div className="gal-state error">Could not load archive. Please refresh.</div>
        ) : filtered.length === 0 ? (
          <div className="gal-state">No passports match your filter.</div>
        ) : (
          <div className="gal-scatter">
            {filtered.map((p, i) => {
              const pattern = LAYOUT_PATTERNS[i % LAYOUT_PATTERNS.length];
              return (
                <div
                  key={p.id || p.code}
                  className="gal-photo"
                  ref={(el) => (photoRefs.current[i] = el)}
                  data-speed={pattern.speed}
                  data-rotate={pattern.rotate}
                  style={{
                    '--photo-w': `${pattern.w}vw`,
                    '--photo-x': `${pattern.offsetX}%`,
                    marginLeft: `${pattern.offsetX}%`,
                    maxWidth: `${pattern.w}vw`,
                  }}
                  onClick={() => openModal(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openModal(p)}
                >
                  <div className="gal-photo-frame">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        loading={i < 6 ? 'eager' : 'lazy'}
                        alt={`ColorOut ${p.code}`}
                        draggable={false}
                      />
                    ) : (
                      <div className="gal-photo-fallback" />
                    )}
                    <div className="gal-photo-glow" />
                  </div>
                  <div className="gal-photo-caption">
                    <span className="gal-photo-code">{p.code || '---'}</span>
                    <span className="gal-photo-loc">{p.city || 'Unknown'}{p.date ? ` · ${p.date.slice(0, 4)}` : ''}</span>
                  </div>
                  <div className="gal-photo-index">
                    {String(i + 1).padStart(2, '0')}/{totalStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL */}
      {selected && (
        <div className="gal-modal" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="gal-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="gal-modal-close" onClick={closeModal} aria-label="Close">&#10005;</button>
            <div className="gal-modal-img">
              {selected.image_url && (
                <img src={selected.image_url} alt={`ColorOut ${selected.code}`} />
              )}
            </div>
            <div className="gal-modal-info">
              <span className="gal-modal-badge">&#10003; Verified Authentic</span>
              <div className="gal-modal-code">{selected.code || '---'}</div>
              <div className="gal-modal-meta">
                <div className="gal-modal-meta-item"><label>Date</label><span>{selected.date || '---'}</span></div>
                <div className="gal-modal-meta-item"><label>Location</label><span>{selected.city || '---'}</span></div>
                <div className="gal-modal-meta-item"><label>Holder</label><span>{selected.holder_name || 'Private'}</span></div>
                <div className="gal-modal-meta-item">
                  <label>Index</label>
                  <span>
                    {String(passports.findIndex((pp) => (pp.id || pp.code) === (selected.id || selected.code)) + 1).padStart(2, '0')} / {totalStr}
                  </span>
                </div>
              </div>
              <p className="gal-modal-note">
                This certificate verifies the authenticity of a ColorOut&#8482; tattoo by Patrick Cat.
                Each piece is freehand, fully chromatic, and recorded in the permanent ColorOut&#8482; archive.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">ColorOut&#8482;</div>
        <div className="footer-sub">Preserving Color as Preserving Humanity</div>
        <div className="footer-links">
          <a href="https://www.instagram.com/patrickcat_art/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://mixiartstudio.us" target="_blank" rel="noopener noreferrer">Mixi Art Studio</a>
          <a href="https://patrickcat.com" target="_blank" rel="noopener noreferrer">patrickcat.com</a>
        </div>
        <p className="footer-copy">&copy; 2026 Mixi Art Studio LLC. All rights reserved.</p>
      </footer>

      <style jsx>{`
        /* ── GALLERY HEADER ── */
        .gal-header {
          min-height: 70vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 0 60px 60px;
          position: relative;
          overflow: hidden;
        }
        .gal-header::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--border-hover), transparent);
        }
        .gal-header-inner {
          max-width: 900px;
        }
        .gal-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--magenta);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .gal-eyebrow-line {
          display: inline-block;
          width: 30px;
          height: 1px;
          background: var(--magenta);
        }
        .gal-title {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: clamp(52px, 10vw, 130px);
          line-height: 0.88;
          letter-spacing: -4px;
          text-transform: uppercase;
          color: var(--fg);
          margin-bottom: 24px;
        }
        .gal-title-thin {
          font-weight: 400;
          color: var(--fg-muted);
        }
        .gal-title-sup {
          font-size: 0.3em;
          vertical-align: super;
          opacity: 0.4;
          letter-spacing: 0;
        }
        .gal-title-spectrum {
          background: var(--gradient-spectrum);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: spectrumFlow 4s linear infinite;
        }
        .gal-subtitle {
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--fg-muted);
          line-height: 1.7;
          max-width: 500px;
        }

        /* ── FILTER TOGGLE ── */
        .gal-filter-toggle {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 80;
          padding: 14px 24px;
          background: rgba(12, 12, 12, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-hover);
          color: var(--fg);
          font-family: var(--font-body);
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          border-radius: 999px;
        }
        .gal-filter-toggle:hover {
          border-color: var(--cyan);
          background: rgba(0, 229, 255, 0.08);
        }
        .gal-filter-icon {
          font-size: 14px;
          opacity: 0.6;
        }
        .gal-filter-count {
          background: var(--cyan);
          color: var(--bg);
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 999px;
          letter-spacing: 0;
        }

        /* ── FILTER DRAWER ── */
        .gal-filter-drawer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 90;
          background: rgba(5, 5, 5, 0.95);
          backdrop-filter: blur(30px);
          border-top: 1px solid var(--border-hover);
          transform: translateY(100%);
          transition: transform 0.4s cubic-bezier(0.65, 0, 0.35, 1);
          max-height: 50vh;
          overflow-y: auto;
        }
        .gal-filter-drawer.open {
          transform: translateY(0);
        }
        .gal-filter-body {
          padding: 32px 40px 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        .gal-filter-section {
          margin-bottom: 24px;
        }
        .gal-filter-label {
          font-family: var(--font-body);
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--fg-dim);
          margin-bottom: 10px;
        }
        .gal-search-input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border);
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--fg);
          outline: none;
          transition: border-color 0.3s;
          border-radius: 0;
        }
        .gal-search-input::placeholder {
          color: var(--fg-dim);
        }
        .gal-search-input:focus {
          border-color: var(--cyan);
        }
        .gal-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .gal-chip {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--fg-muted);
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s;
          border-radius: 999px;
        }
        .gal-chip span {
          font-size: 9px;
          opacity: 0.5;
          margin-left: 4px;
        }
        .gal-chip:hover {
          border-color: var(--fg);
          color: var(--fg);
        }
        .gal-chip.active {
          background: var(--fg);
          color: var(--bg);
          border-color: var(--fg);
        }
        .gal-filter-close {
          padding: 12px 28px;
          background: var(--cyan);
          border: none;
          color: var(--bg);
          font-family: var(--font-body);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          border-radius: 999px;
        }
        .gal-filter-close:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 229, 255, 0.3);
        }

        /* ── SCATTERED PHOTOS ── */
        .gal-scatter-wrap {
          min-height: 100vh;
          padding: 80px 0 120px;
          position: relative;
        }
        .gal-scatter {
          position: relative;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .gal-photo {
          position: relative;
          margin-bottom: 60px;
          cursor: pointer;
          will-change: transform;
          outline: none;
          transition: filter 0.4s;
        }
        .gal-photo:hover {
          filter: brightness(1.08);
        }
        .gal-photo:focus-visible {
          outline: 2px solid var(--cyan);
          outline-offset: 8px;
        }

        .gal-photo-frame {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border);
          transition: border-color 0.4s;
        }
        .gal-photo:hover .gal-photo-frame {
          border-color: rgba(0, 229, 255, 0.3);
        }
        .gal-photo-frame img {
          display: block;
          width: 100%;
          aspect-ratio: 3/4;
          object-fit: cover;
          transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .gal-photo:hover .gal-photo-frame img {
          transform: scale(1.04);
        }
        .gal-photo-fallback {
          width: 100%;
          aspect-ratio: 3/4;
          background: repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.02),
            rgba(255, 255, 255, 0.02) 8px,
            rgba(255, 255, 255, 0.05) 8px,
            rgba(255, 255, 255, 0.05) 16px
          );
        }
        .gal-photo-glow {
          position: absolute;
          bottom: -40%;
          left: 10%;
          right: 10%;
          height: 60%;
          background: radial-gradient(
            ellipse at center,
            rgba(0, 229, 255, 0.08) 0%,
            transparent 70%
          );
          opacity: 0;
          transition: opacity 0.5s;
          pointer-events: none;
        }
        .gal-photo:hover .gal-photo-glow {
          opacity: 1;
        }

        .gal-photo-caption {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding: 12px 4px 0;
        }
        .gal-photo-code {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 1px;
          color: var(--fg);
          text-transform: uppercase;
        }
        .gal-photo-loc {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--fg-dim);
        }
        .gal-photo-index {
          position: absolute;
          top: 12px;
          right: 12px;
          font-family: var(--font-body);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1px;
          color: var(--fg-dim);
          background: rgba(5, 5, 5, 0.7);
          backdrop-filter: blur(8px);
          padding: 4px 8px;
          z-index: 2;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .gal-photo:hover .gal-photo-index {
          opacity: 1;
        }

        /* ── LOADING / EMPTY ── */
        .gal-loading {
          text-align: center;
          padding: 120px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .gal-loading span {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--fg-dim);
        }
        .gal-loading-bar {
          width: 120px;
          height: 2px;
          background: var(--gradient-spectrum);
          background-size: 300% 100%;
          animation: spectrumFlow 2s linear infinite;
        }
        .gal-state {
          text-align: center;
          padding: 120px 20px;
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--fg-dim);
        }
        .gal-state.error {
          color: rgba(255, 45, 123, 0.8);
        }

        /* ── MODAL ── */
        .gal-modal {
          position: fixed;
          inset: 0;
          background: rgba(5, 5, 5, 0.88);
          backdrop-filter: blur(30px);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          animation: modalFadeIn 0.3s ease;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .gal-modal-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1100px;
          width: 100%;
          max-height: 88vh;
          background: var(--bg-elevated);
          border: 1px solid var(--border-hover);
          overflow: hidden;
          position: relative;
          animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .gal-modal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-spectrum);
          background-size: 300% 100%;
          animation: spectrumFlow 4s linear infinite;
          z-index: 3;
        }
        .gal-modal-img {
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gal-modal-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .gal-modal-info {
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
        }
        .gal-modal-badge {
          display: inline-block;
          align-self: flex-start;
          background: rgba(0, 255, 136, 0.1);
          color: var(--green);
          border: 1px solid rgba(0, 255, 136, 0.25);
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 5px 14px;
          font-weight: 600;
        }
        .gal-modal-code {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 42px;
          letter-spacing: -1px;
          color: var(--fg);
          line-height: 1;
        }
        .gal-modal-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        .gal-modal-meta-item :global(label) {
          font-family: var(--font-body);
          font-size: 9px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: var(--fg-dim);
          display: block;
          margin-bottom: 4px;
        }
        .gal-modal-meta-item :global(span) {
          font-size: 14px;
          color: var(--fg);
          font-weight: 600;
        }
        .gal-modal-note {
          font-size: 12px;
          line-height: 1.7;
          color: var(--fg-muted);
          padding-top: 20px;
          border-top: 1px solid var(--border);
        }
        .gal-modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 40px;
          height: 40px;
          border: 1px solid var(--border-hover);
          background: rgba(5, 5, 5, 0.7);
          backdrop-filter: blur(8px);
          font-size: 14px;
          cursor: pointer;
          z-index: 5;
          transition: all 0.25s;
          color: var(--fg);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .gal-modal-close:hover {
          border-color: var(--magenta);
          color: var(--magenta);
          background: rgba(255, 45, 123, 0.1);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 900px) {
          .gal-header {
            min-height: 55vh;
            padding: 0 24px 40px;
          }
          .gal-title {
            font-size: clamp(40px, 13vw, 80px);
            letter-spacing: -2px;
          }
          .gal-subtitle {
            font-size: 13px;
          }
          .gal-filter-toggle {
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            font-size: 11px;
          }
          .gal-filter-body {
            padding: 24px 20px 32px;
          }
          .gal-scatter {
            padding: 0 16px;
          }
          .gal-photo {
            margin-bottom: 40px;
            /* On mobile, override scattered layout for cleaner stacking */
            margin-left: 0 !important;
            max-width: 85vw !important;
          }
          .gal-photo:nth-child(even) {
            margin-left: auto !important;
          }
          .gal-modal {
            padding: 0;
          }
          .gal-modal-card {
            grid-template-columns: 1fr;
            max-height: 100vh;
            border-radius: 0;
          }
          .gal-modal-img {
            aspect-ratio: 1;
            max-height: 50vh;
          }
          .gal-modal-info {
            padding: 28px 22px;
          }
          .gal-modal-code {
            font-size: 32px;
          }
        }
        @media (max-width: 500px) {
          .gal-photo {
            max-width: 92vw !important;
          }
        }
      `}</style>
    </>
  );
}
