'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

/* ── Supabase image data ── */
const SUPABASE_URL =
  'https://ypwgutlxjdpszlkwzyyu.supabase.co/storage/v1/object/public/passport-images';

function generateWorks() {
  // 2026 series: CO-2026-0071 through CO-2026-0082
  const works2026 = [];
  for (let i = 71; i <= 82; i++) {
    const pad = String(i).padStart(4, '0');
    const ext = i === 71 || i === 82 ? 'JPG' : i === 81 ? 'jpeg' : 'jpg';
    works2026.push({
      code: `CO-2026-${pad}`,
      file: `CO-2026-${pad}.${ext}`,
      era: '2026',
    });
  }

  // Legacy series: CO-LEGACY-0001 through CO-LEGACY-0070
  const legacyJpeg = new Set([53, 56, 57, 58, 70]);
  const worksLegacy = [];
  for (let i = 1; i <= 70; i++) {
    const pad = String(i).padStart(4, '0');
    const ext = legacyJpeg.has(i) ? 'jpeg' : 'jpg';
    worksLegacy.push({
      code: `CO-LEGACY-${pad}`,
      file: `CO-LEGACY-${pad}.${ext}`,
      era: 'legacy',
    });
  }

  // Most recent first
  return [...works2026.reverse(), ...worksLegacy.reverse()];
}

const ALL_WORKS = generateWorks();

export default function GalleryPage() {
  const [filter, setFilter] = useState('all');
  const [works, setWorks] = useState(ALL_WORKS);
  const gridRef = useRef(null);

  useEffect(() => {
    if (filter === 'all') setWorks(ALL_WORKS);
    else setWorks(ALL_WORKS.filter((w) => w.era === filter));
  }, [filter]);

  /* ── Scroll progress bar ── */
  useEffect(() => {
    const bar = document.getElementById('galleryProgress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = h > 0 ? (window.scrollY / h) * 100 + '%' : '0%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Custom cursor (desktop) ── */
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 769) return;
    const dot = document.getElementById('gCurDot');
    const ring = document.getElementById('gCurRing');
    if (!dot || !ring) return;
    let mx = 0, my = 0, cx = 0, cy = 0, raf;
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    const loop = () => {
      cx += (mx - cx) * 0.15;
      cy += (my - cy) * 0.15;
      dot.style.transform = `translate(${mx - 4}px,${my - 4}px)`;
      ring.style.transform = `translate(${cx - 18}px,${cy - 18}px)`;
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Stagger entrance animation ── */
  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll('.archive-card');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      const delay = Math.min(i * 40, 800);
      setTimeout(() => {
        card.style.transition =
          'opacity .5s cubic-bezier(.23,1,.32,1), transform .5s cubic-bezier(.23,1,.32,1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, delay);
    });
  }, [works]);

  const handleFilter = useCallback((era) => {
    setFilter(era);
  }, []);

  return (
    <>
      {/* Custom cursor */}
      <div className="cur-dot" id="gCurDot" />
      <div className="cur-ring" id="gCurRing" />

      {/* Progress bar */}
      <div className="progress" id="galleryProgress" />

      {/* Nav */}
      <nav className="gallery-nav">
        <Link href="/" className="nav-brand spectrum-text">
          ColorOut&trade;
        </Link>
        <Link href="/" className="nav-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
            <path d="M15 18L9 12L15 6" />
          </svg>
          Back to Showroom
        </Link>
      </nav>

      {/* Hero */}
      <div className="archive-hero">
        <h1>
          The <span className="spectrum-text">Archive</span>
        </h1>
        <p className="subtitle">
          Every ColorOut&trade; work documented &mdash; tattoos, paintings, and
          sculptures preserving color as a living language across skin and canvas.
        </p>
        <div className="divider" />
      </div>

      {/* Filter tabs */}
      <div className="filters">
        {['all', '2026', 'legacy'].map((era) => (
          <button
            key={era}
            className={`filter-btn${filter === era ? ' active' : ''}`}
            onClick={() => handleFilter(era)}
          >
            {era === 'all' ? 'All' : era === '2026' ? '2026' : 'Legacy'}
          </button>
        ))}
      </div>

      {/* Masonry grid */}
      <div className="archive-grid" ref={gridRef}>
        {works.map((w) => (
          <div className="archive-card" key={w.code}>
            <div className="archive-card-visual">
              <img
                src={`${SUPABASE_URL}/${w.file}`}
                alt={w.code}
                loading="lazy"
                onLoad={(e) => e.target.classList.add('loaded')}
                onError={(e) => {
                  e.target.parentElement.style.display = 'none';
                }}
              />
            </div>
            <div className="archive-card-info">
              <div className="card-title">{w.code}</div>
              <div className="card-meta">ColorOut&trade; by Patrick Cat</div>
            </div>
          </div>
        ))}
      </div>

      {/* Counter */}
      <div className="archive-counter">{works.length} works</div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-spectrum" />
        <div className="footer-bottom">
          <div className="footer-bottom-brand spectrum-text">ColorOut&trade;</div>
          <ul className="footer-bottom-links">
            <li>
              <a href="https://instagram.com/patrickcat_art" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://mixiartstudio.us" target="_blank" rel="noopener noreferrer">
                Mixi Art
              </a>
            </li>
            <li>
              <Link href="/">Passport</Link>
            </li>
          </ul>
          <div className="footer-bottom-copy">&copy; 2026 Mixi Art Studio LLC</div>
        </div>
      </footer>

      <style jsx>{`
        /* ── NAV ── */
        .gallery-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: calc(env(safe-area-inset-top, 0px) + 20px) 40px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(245, 243, 240, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(26, 26, 26, 0.06);
        }
        .nav-brand {
          font-family: var(--font-display);
          font-size: 12px;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: var(--fg);
          text-decoration: none;
        }
        .nav-back {
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--fg-muted);
          text-decoration: none;
          transition: color 0.3s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .nav-back:hover {
          color: var(--fg);
        }

        /* ── HERO ── */
        .archive-hero {
          padding: 160px 40px 80px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .archive-hero h1 {
          font-family: var(--font-display);
          font-size: clamp(48px, 9vw, 120px);
          font-weight: 700;
          letter-spacing: -3px;
          text-transform: uppercase;
          line-height: 0.85;
          margin-bottom: 24px;
        }
        .subtitle {
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.8;
          color: var(--fg-muted);
          max-width: 520px;
          margin: 0 auto;
        }
        .divider {
          width: 60px;
          height: 2px;
          margin: 40px auto 0;
          background: var(--gradient-spectrum);
          background-size: 300% 100%;
          animation: specFlow 3s linear infinite;
        }

        /* ── FILTERS ── */
        .filters {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 0 24px 60px;
          flex-wrap: wrap;
        }
        .filter-btn {
          font-family: var(--font-display);
          font-size: 10px;
          letter-spacing: 3px;
          text-transform: uppercase;
          padding: 10px 24px;
          border: 1px solid var(--fg-dim);
          background: none;
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.3s;
        }
        .filter-btn:hover,
        .filter-btn.active {
          background: var(--fg);
          color: var(--bg);
          border-color: var(--fg);
        }

        /* ── MASONRY GRID ── */
        .archive-grid {
          column-count: 3;
          column-gap: 20px;
          padding: 0 40px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ── CARDS ── */
        .archive-card {
          break-inside: avoid;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
            box-shadow 0.4s;
        }
        .archive-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(26, 26, 26, 0.04);
        }
        .archive-card-visual {
          width: 100%;
          position: relative;
          overflow: hidden;
          background: rgba(26, 26, 26, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .archive-card-visual :global(img) {
          width: 100%;
          display: block;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .archive-card-visual :global(img.loaded) {
          opacity: 1;
        }
        .archive-card-info {
          padding: 16px 18px 20px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .card-title {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .card-meta {
          font-family: var(--font-display);
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--fg-dim);
        }

        /* ── COUNTER ── */
        .archive-counter {
          text-align: center;
          padding: 0 24px 80px;
          font-family: var(--font-display);
          font-size: 11px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--fg-dim);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .archive-grid {
            column-count: 2;
            padding: 0 24px 60px;
          }
        }
        @media (max-width: 768px) {
          .gallery-nav {
            padding: calc(env(safe-area-inset-top, 0px) + 16px) 20px 16px;
          }
          .archive-hero {
            padding: 120px 24px 60px;
          }
        }
        @media (max-width: 560px) {
          .archive-grid {
            column-count: 1;
            padding: 0 16px 40px;
          }
        }
      `}</style>
    </>
  );
}
