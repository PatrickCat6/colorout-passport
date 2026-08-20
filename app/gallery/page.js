'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';

export default function GalleryPage() {
  const [passports, setPassports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [city, setCity] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('code-asc');
  const [view, setView] = useState('comfy'); // comfy | dense | list
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetch all via server API (no client-side Supabase key)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/passports');
        const data = await r.json();
        if (!cancelled && data.success && Array.isArray(data.passports)) {
          setPassports(data.passports);
        } else if (!cancelled) {
          setErrored(true);
        }
      } catch (e) {
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

  // Esc closes modal
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    list.sort((a, b) => {
      if (sort === 'code-asc') return (a.code || '').localeCompare(b.code || '');
      if (sort === 'code-desc') return (b.code || '').localeCompare(a.code || '');
      if (sort === 'date-desc') return (b.date || '').localeCompare(a.date || '');
      if (sort === 'date-asc') return (a.date || '').localeCompare(b.date || '');
      return 0;
    });
    return list;
  }, [passports, city, search, sort]);

  const total = passports.length;
  const totalStr = String(total).padStart(2, '0');

  const openModal = useCallback((p) => setSelected(p), []);
  const closeModal = useCallback(() => setSelected(null), []);

  return (
    <>
      <div className="spectrum-bar" />

      <nav>
        <div className="nav-logo" style={{ fontSize: '17px' }}>COLOROUT&#8482;</div>
        <div className="nav-links">
          <Link href="/#about">About</Link>
          <Link href="/#verify">Verify</Link>
          <Link href="/gallery" className="active" style={{ color: 'var(--white)' }}>Gallery</Link>
          <Link href="/#benefits">Benefits</Link>
        </div>
        <button className="nav-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>MENU</button>
      </nav>

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
      <header className="gallery-header">
        <div>
          <div className="gallery-eyebrow">The Archive &middot; 2020 — 2026</div>
          <h1 className="gallery-title">
            Gallery<span className="ar">/{totalStr}</span>
          </h1>
        </div>
        <div className="gallery-meta">
          <strong>{totalStr}</strong>
          Authenticated<br />ColorOut&#8482; Tattoos
        </div>
      </header>

      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button
            className={`filter-chip${city === 'all' ? ' active' : ''}`}
            onClick={() => setCity('all')}
          >
            All <span className="count">{total}</span>
          </button>
          {cities.map(([c, n]) => (
            <button
              key={c}
              className={`filter-chip${city === c ? ' active' : ''}`}
              onClick={() => setCity(c)}
            >
              {c} <span className="count">{n}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <div className="toolbar-search">
            <input
              type="text"
              placeholder="Search code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="code-asc">Code ↑</option>
            <option value="code-desc">Code ↓</option>
            <option value="date-desc">Newest</option>
            <option value="date-asc">Oldest</option>
          </select>
          <div className="view-toggle">
            {['comfy', 'dense', 'list'].map((v) => (
              <button
                key={v}
                className={`view-btn${view === v ? ' active' : ''}`}
                onClick={() => setView(v)}
              >
                {v === 'comfy' ? 'Grid' : v === 'dense' ? 'Dense' : 'List'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="gallery-wrap">
        {loading ? (
          <div className={`grid ${view}`}>
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        ) : errored ? (
          <div className="state error">Could not load archive. Please refresh.</div>
        ) : filtered.length === 0 ? (
          <div className="state">No passports match your filter.</div>
        ) : (
          <div className={`grid ${view}`}>
            {filtered.map((p, i) => (
              <button
                key={p.id || p.code}
                className="tile"
                onClick={() => openModal(p)}
                type="button"
              >
                {view === 'list' ? (
                  <>
                    {p.image_url ? (
                      <img src={p.image_url} loading="lazy" alt={`ColorOut ${p.code}`} />
                    ) : (
                      <div className="list-img-fallback" />
                    )}
                    <div className="list-info">
                      <div className="lc">{p.code || '—'}</div>
                      <div className="lm">
                        {(p.city || 'Unknown')} &middot; {p.date || '—'}
                        {p.holder_name ? ` · ${p.holder_name}` : ''}
                      </div>
                    </div>
                    <div className="list-arrow">→</div>
                  </>
                ) : (
                  <>
                    <div className="tile-corner">{p.code || '—'}</div>
                    <div className="tile-index">
                      {String(i + 1).padStart(2, '0')}/{totalStr}
                    </div>
                    {p.image_url ? (
                      <img src={p.image_url} loading="lazy" alt={`ColorOut ${p.code}`} />
                    ) : (
                      <div className="tile-fallback" />
                    )}
                    <div className="tile-overlay">
                      <div className="tile-code">{p.code}</div>
                      <div className="tile-meta">
                        ◉ {p.city || 'Unknown'}
                        {p.date ? ` · ${(p.date || '').slice(0, 4)}` : ''}
                      </div>
                    </div>
                    <div className="tile-bar" />
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="modal open" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
            <div className="modal-img">
              {selected.image_url && <img src={selected.image_url} alt={`ColorOut ${selected.code}`} />}
            </div>
            <div className="modal-info">
              <span className="modal-eyebrow">✓ Verified Authentic</span>
              <div className="modal-code">{selected.code || '—'}</div>
              <div className="modal-meta">
                <div className="modal-meta-item"><label>Date</label><span>{selected.date || '—'}</span></div>
                <div className="modal-meta-item"><label>Location</label><span>{selected.city || '—'}</span></div>
                <div className="modal-meta-item"><label>Holder</label><span>{selected.holder_name || 'Private'}</span></div>
                <div className="modal-meta-item">
                  <label>Index</label>
                  <span>
                    {String(passports.findIndex((p) => (p.id || p.code) === (selected.id || selected.code)) + 1).padStart(2, '0')} / {totalStr}
                  </span>
                </div>
              </div>
              <p className="modal-note">
                This certificate verifies the authenticity of a ColorOut&#8482; tattoo by Patrick Cat. Each piece is freehand, fully chromatic, and recorded in the permanent ColorOut&#8482; archive.
              </p>
            </div>
          </div>
        </div>
      )}

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
        .gallery-header {
          padding: 140px 40px 40px;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          align-items: end;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
        }
        .gallery-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--magenta);
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .gallery-eyebrow::before {
          content: '';
          width: 30px;
          height: 1px;
          background: var(--magenta);
        }
        .gallery-title {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: clamp(60px, 9vw, 140px);
          line-height: 0.85;
          letter-spacing: -4px;
          text-transform: uppercase;
          color: var(--white);
        }
        .gallery-title :global(.ar) {
          font-size: 0.28em;
          vertical-align: top;
          opacity: 0.45;
          font-weight: 500;
          letter-spacing: 1px;
          margin-left: 8px;
        }
        .gallery-meta {
          text-align: right;
          font-family: var(--font-body);
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.45);
          line-height: 1.8;
        }
        .gallery-meta strong {
          display: block;
          font-size: 48px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -1px;
          line-height: 1;
          margin-bottom: 6px;
        }

        .toolbar {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 40px;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
          position: sticky;
          top: 60px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          z-index: 50;
        }
        .toolbar-left {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }
        .filter-chip {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid rgba(10, 10, 10, 0.12);
          color: rgba(10, 10, 10, 0.55);
          cursor: pointer;
          transition: all 0.25s;
          border-radius: 0;
        }
        .filter-chip:hover {
          border-color: var(--white);
          color: var(--white);
        }
        .filter-chip.active {
          background: var(--white);
          color: var(--black);
          border-color: var(--white);
        }
        .filter-chip :global(.count) {
          font-size: 9px;
          margin-left: 6px;
          opacity: 0.6;
          font-weight: 500;
        }

        .toolbar-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .toolbar-search {
          position: relative;
          display: flex;
          align-items: center;
        }
        .toolbar-search input {
          padding: 10px 14px 10px 36px;
          background: rgba(10, 10, 10, 0.04);
          border: 1px solid rgba(10, 10, 10, 0.08);
          font-family: var(--font-body);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--white);
          outline: none;
          width: 180px;
          transition: all 0.25s;
        }
        .toolbar-search input::placeholder {
          color: rgba(10, 10, 10, 0.3);
        }
        .toolbar-search input:focus {
          border-color: var(--cyan);
          background: rgba(0, 229, 255, 0.04);
          width: 240px;
        }
        .toolbar-search::before {
          content: '⌕';
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          color: rgba(10, 10, 10, 0.4);
          pointer-events: none;
        }

        .sort-select {
          padding: 8px 14px;
          background: transparent;
          border: 1px solid rgba(10, 10, 10, 0.12);
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
          color: rgba(10, 10, 10, 0.55);
          cursor: pointer;
        }

        .view-toggle {
          display: flex;
          border: 1px solid rgba(10, 10, 10, 0.12);
        }
        .view-btn {
          padding: 9px 12px;
          background: transparent;
          border: none;
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.45);
          cursor: pointer;
          transition: all 0.25s;
          border-right: 1px solid rgba(10, 10, 10, 0.08);
        }
        .view-btn:last-child {
          border-right: none;
        }
        .view-btn:hover {
          color: var(--white);
        }
        .view-btn.active {
          background: var(--white);
          color: var(--black);
        }

        .gallery-wrap {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 40px 80px;
        }

        .grid {
          display: grid;
          gap: 14px;
        }
        .grid.dense {
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        }
        .grid.comfy {
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }
        .grid.list {
          grid-template-columns: 1fr;
          gap: 0;
        }

        .tile {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border: 1px solid rgba(10, 10, 10, 0.06);
          cursor: pointer;
          background: rgba(10, 10, 10, 0.025);
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.3s;
          padding: 0;
          text-align: left;
          font: inherit;
          color: inherit;
        }
        .tile:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 229, 255, 0.4);
        }
        .tile :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .tile:hover :global(img) {
          transform: scale(1.04);
        }
        .tile-fallback {
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            45deg,
            rgba(10, 10, 10, 0.04),
            rgba(10, 10, 10, 0.04) 8px,
            rgba(10, 10, 10, 0.07) 8px,
            rgba(10, 10, 10, 0.07) 16px
          );
        }
        .tile-corner {
          position: absolute;
          top: 10px;
          left: 10px;
          font-family: var(--font-body);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          background: rgba(255, 255, 255, 0.92);
          color: var(--white);
          padding: 4px 8px;
          z-index: 2;
          text-transform: uppercase;
        }
        .tile-index {
          position: absolute;
          top: 10px;
          right: 10px;
          font-family: var(--font-body);
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1px;
          color: rgba(10, 10, 10, 0.45);
          background: rgba(255, 255, 255, 0.7);
          padding: 3px 6px;
          z-index: 2;
        }
        .tile-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 35%, rgba(255, 255, 255, 0.95));
          padding: 18px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .tile:hover .tile-overlay {
          opacity: 1;
        }
        .tile-code {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 15px;
          color: var(--white);
        }
        .tile-meta {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.55);
          margin-top: 4px;
        }
        .tile-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          width: 100%;
          background: var(--gradient-spectrum);
          background-size: 200% 100%;
          animation: spectrumFlow 4s linear infinite;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }
        .tile:hover .tile-bar {
          transform: scaleX(1);
        }

        /* LIST VIEW */
        .grid.list .tile {
          aspect-ratio: auto;
          display: grid;
          grid-template-columns: 120px 1fr auto;
          gap: 24px;
          align-items: center;
          padding: 0;
          border: none;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
          height: auto;
          background: transparent;
        }
        .grid.list .tile:hover {
          transform: none;
          background: rgba(10, 10, 10, 0.02);
        }
        .grid.list .tile :global(img) {
          width: 120px;
          height: 120px;
        }
        .list-img-fallback {
          width: 120px;
          height: 120px;
          background: rgba(10, 10, 10, 0.04);
        }
        .list-info {
          padding: 18px 0;
        }
        .list-info :global(.lc) {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 1px;
          color: var(--white);
        }
        .list-info :global(.lm) {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.5);
          margin-top: 4px;
        }
        .list-arrow {
          padding-right: 18px;
          font-family: var(--font-body);
          font-size: 18px;
          color: rgba(10, 10, 10, 0.3);
          transition: transform 0.25s, color 0.25s;
        }
        .grid.list .tile:hover .list-arrow {
          color: var(--cyan);
          transform: translateX(4px);
        }

        .state {
          text-align: center;
          padding: 80px 20px;
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.35);
        }
        .state.error {
          color: rgba(255, 45, 123, 0.8);
        }
        .skeleton {
          aspect-ratio: 1;
          background: linear-gradient(
            90deg,
            rgba(10, 10, 10, 0.04),
            rgba(10, 10, 10, 0.08),
            rgba(10, 10, 10, 0.04)
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border: 1px solid rgba(10, 10, 10, 0.05);
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .modal {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .modal-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          max-width: 1100px;
          width: 100%;
          max-height: 88vh;
          background: var(--black);
          border: 1px solid rgba(10, 10, 10, 0.1);
          box-shadow: 0 30px 80px rgba(10, 10, 10, 0.18);
          overflow: hidden;
          position: relative;
        }
        .modal-card::before {
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
        .modal-img {
          background: #000;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-img :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .modal-info {
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
        }
        .modal-eyebrow {
          display: inline-block;
          align-self: flex-start;
          background: rgba(0, 255, 136, 0.12);
          color: #00b85f;
          border: 1px solid rgba(0, 255, 136, 0.35);
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          padding: 5px 12px;
          font-weight: 600;
        }
        .modal-code {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 42px;
          letter-spacing: -1px;
          color: var(--white);
          line-height: 1;
        }
        .modal-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          padding-top: 20px;
          border-top: 1px solid rgba(10, 10, 10, 0.08);
        }
        .modal-meta-item :global(label) {
          font-family: var(--font-body);
          font-size: 9px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.4);
          display: block;
          margin-bottom: 4px;
        }
        .modal-meta-item :global(span) {
          font-size: 14px;
          color: var(--white);
          font-weight: 600;
        }
        .modal-note {
          font-size: 12px;
          line-height: 1.7;
          color: rgba(10, 10, 10, 0.5);
          padding-top: 20px;
          border-top: 1px solid rgba(10, 10, 10, 0.08);
        }
        .modal-close {
          position: absolute;
          top: 18px;
          right: 18px;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(10, 10, 10, 0.15);
          background: rgba(255, 255, 255, 0.85);
          font-family: var(--font-body);
          font-size: 14px;
          cursor: pointer;
          z-index: 5;
          transition: all 0.25s;
          color: var(--white);
        }
        .modal-close:hover {
          border-color: var(--magenta);
          color: var(--magenta);
        }

        @media (max-width: 900px) {
          .gallery-header {
            padding: 120px 20px 30px;
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .gallery-meta {
            text-align: left;
          }
          .toolbar {
            padding: 18px 20px;
            gap: 14px;
            top: 56px;
          }
          .toolbar-search input {
            width: 140px;
          }
          .toolbar-search input:focus {
            width: 160px;
          }
          .gallery-wrap {
            padding: 24px 20px 60px;
          }
          .grid.comfy,
          .grid.dense {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .modal {
            padding: 0;
          }
          .modal-card {
            grid-template-columns: 1fr;
            max-height: 100vh;
          }
          .modal-img {
            aspect-ratio: 1;
            max-height: 50vh;
          }
          .modal-info {
            padding: 28px 22px;
          }
          .modal-code {
            font-size: 32px;
          }
        }
      `}</style>
    </>
  );
}
