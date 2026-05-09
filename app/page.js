'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

const HERO_IMAGE = 'https://cdn.prod.website-files.com/69af75f4cb0da0cb8e4b814c/69feb2b39ba97bfde8e00ce7_Untitled%20design.PNG';

export default function Home() {
  const logoRef = useRef(null);
  const threeLoaded = useRef(false);
  const [totalCount, setTotalCount] = useState('...');
  const [gallery, setGallery] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Fetch total passport count
  useEffect(() => {
    async function fetchCount() {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?select=*`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact'
          }
        });
        const c = r.headers.get('content-range');
        let total = 70;
        if (c) { total = parseInt(c.split('/')[1]) || 70; }
        else { const d = await r.json(); if (Array.isArray(d)) total = d.length; }
        setTotalCount(total);
      } catch (e) { console.error(e); }
    }
    fetchCount();
  }, []);

  // Fetch gallery
  useEffect(() => {
    async function fetchGallery() {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?select=*&order=code.asc&limit=6`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
        const data = await r.json();
        if (Array.isArray(data)) setGallery(data);
      } catch (e) { console.error(e); }
    }
    fetchGallery();
  }, []);

  // Search handler
  const handleSearch = useCallback(async () => {
    const code = searchCode.toUpperCase().trim();
    if (!code) return;
    setResult(null);
    setNotFound(false);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?code=eq.${code}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await r.json();
      if (data && data.length > 0) {
        setResult(data[0]);
      } else {
        setNotFound(true);
      }
    } catch (e) { console.error(e); }
  }, [searchCode]);

  // 3D Logo
  const initThreeDLogo = useCallback(() => {
    if (!window.THREE || !logoRef.current || threeLoaded.current) return;
    threeLoaded.current = true;
    const THREE = window.THREE;
    const container = logoRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 5, 5);
    scene.add(dir);

    const loader = new THREE.FontLoader();
    const textGroup = new THREE.Group();
    scene.add(textGroup);
    const letterMeshes = [];

    loader.load('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json', (font) => {
      const text = 'ColorOut\u2122';
      const size = 1.7;
      const depth = 0.5;
      let offsetX = 0;

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const cs = ch === '\u2122' ? size * 0.4 : size;
        const cd = ch === '\u2122' ? depth * 0.5 : depth;
        const geo = new THREE.TextGeometry(ch, {
          font, size: cs, height: cd, curveSegments: 12,
          bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 3
        });
        geo.computeBoundingBox();
        const w = geo.boundingBox.max.x - geo.boundingBox.min.x;
        const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.15 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = offsetX;
        if (ch === '\u2122') mesh.position.y = cs * 0.95;
        textGroup.add(mesh);
        letterMeshes.push({ mesh, mat, index: i, total: text.length });
        offsetX += w + 0.1;
      }

      const box = new THREE.Box3().setFromObject(textGroup);
      const center = new THREE.Vector3();
      box.getCenter(center);
      textGroup.children.forEach(c => {
        c.position.x -= center.x;
        c.position.y -= center.y;
        c.position.z -= center.z;
      });
    });

    let time = 0;
    const color = new THREE.Color();

    function animate() {
      requestAnimationFrame(animate);
      time += 1;
      textGroup.rotation.y += 0.01;
      letterMeshes.forEach(item => {
        const hue = ((time * 0.008) + (item.index / item.total)) % 1;
        color.setHSL(hue, 0.85, 0.55);
        item.mat.color.copy(color);
      });
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        strategy="afterInteractive"
        onLoad={initThreeDLogo}
      />

      <div className="spectrum-bar" />

      {/* NAV */}
      <nav>
        <div className="nav-logo">ColorOut&#8482;</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#verify">Verify</a>
          <a href="#gallery">Gallery</a>
          <a href="#benefits">Benefits</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg-grid" />
        <div className="logo-3d-container" ref={logoRef} />

        <div className="hero-image-container">
          <img src={HERO_IMAGE} alt="ColorOut by Patrick Cat" />
        </div>

        <div className="hero-label">Certificate of Authenticity</div>
        <h1 className="hero-title">
          <span className="hero-title-gradient">Preserving Color.<br />Preserving Humanity.</span>
        </h1>
        <p className="hero-subtitle">
          Each ColorOut&#8482; tattoo is a unique work of art, documented and authenticated with a permanent certificate of provenance by Patrick Cat.
        </p>

        <div className="hero-cta-group">
          <a href="https://www.instagram.com/patrickcat_art/" target="_blank" rel="noopener noreferrer" className="btn-instagram">
            <span>&#10022;</span> Follow on Instagram
          </a>
        </div>

        <div className="stats-bar">
          <div className="stat">
            <div className="stat-number">{totalCount}</div>
            <div className="stat-label">ColorOut&#8482; Tattoos</div>
          </div>
          <div className="stat">
            <div className="stat-number">6</div>
            <div className="stat-label">Cities</div>
          </div>
          <div className="stat">
            <div className="stat-number">2020</div>
            <div className="stat-label">Project Founded</div>
          </div>
        </div>
      </section>

      {/* ABOUT / STATEMENT */}
      <section className="statement-section" id="about">
        <div>
          <div className="section-label">The Concept</div>
          <div className="statement-quote">
            Color inhabits and co-inhabits spaces and objects, as well as emotions and memories that shape dreams. Preserving color is preserving our capacity to feel, to dream, and to be.
          </div>
        </div>
        <div className="statement-body">
          <p>ColorOut&#8482; is a multidisciplinary artistic project that uses color as a living language to create immersive experiences through tattoos, paintings, and sculptures. It seeks to connect dimensions: two-dimensional, three-dimensional, digital, and tactile in a cyclical process that transcends limits.</p>
          <p>The skin, as a living canvas and organic Wunderkammer, becomes a unique exhibition space where the tattoo integrates color into the body, fusing it with the wearer&#39;s identity. The tattoo turns color into a medium to inhabit the body in a way that transcends the visual: it is felt, experienced, and integrated as part of the being.</p>
          <p>In opposition to the monochromatic, which limits humans from their essence, ColorOut&#8482; celebrates color as a universal vehicle that unites the personal with the collective. An experiential bridge that invites inhabiting color in an intimate, transformative, and permanent way.</p>
        </div>
      </section>

      {/* THE PROCESS */}
      <section className="section">
        <div className="section-label cyan">The Process</div>
        <h2 className="section-title">From Skin to Archive</h2>
        <p className="section-body" style={{ marginBottom: '48px' }}>
          Every ColorOut&#8482; tattoo follows a deliberate, freehand process, finding the movement of color across the body, creating chromatic transitions that convey the joy of color as a lived experience.
        </p>
        <div className="concept-grid">
          <div className="concept-card">
            <div className="concept-card-number">01</div>
            <h3>Freehand Mapping</h3>
            <p>Each piece begins with a direct, intuitive drawing on skin, finding the natural movement and flow of color across the body&#39;s unique contours. No stencils. Pure dialogue between artist and canvas.</p>
          </div>
          <div className="concept-card">
            <div className="concept-card-number">02</div>
            <h3>Chromatic Saturation</h3>
            <p>Layers of vibrant color are built using Patrick&#39;s signature spectrum, a full-body approach where color transcends illustration and becomes an immersive experience that envelops the wearer.</p>
          </div>
          <div className="concept-card">
            <div className="concept-card-number">03</div>
            <h3>Passport Issuance</h3>
            <p>Upon completion, each work is documented with a unique ColorOut&#8482; Passport code, photograph, date, and location, creating a permanent certificate of provenance linking artist, work, and collector.</p>
          </div>
        </div>
      </section>

      {/* VERIFY */}
      <section className="verify-section" id="verify">
        <div className="section-label green">Authenticate</div>
        <h2 className="section-title">Verify Your Passport</h2>
        <p className="section-body">
          Enter your unique ColorOut&#8482; code to verify the authenticity of your tattoo and access your certificate of provenance.
        </p>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="CO-2026-0001"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button className="search-button" onClick={handleSearch}>
            &#128269; Verify
          </button>
        </div>

        {result && (
          <div className="result-card" style={{ display: 'block' }}>
            {result.image_url && (
              <img src={result.image_url} alt={`ColorOut ${result.code}`} />
            )}
            <div className="result-verified">&#10003; Verified Authentic</div>
            <div className="result-code">{result.code}</div>
            <div className="result-meta">
              <div className="result-meta-item">
                <label>Date</label>
                <span>{result.date || '...'}</span>
              </div>
              <div className="result-meta-item">
                <label>Location</label>
                <span>{result.city || '...'}</span>
              </div>
            </div>
            {result.holder_name && (
              <div className="result-holder">
                <span>Holder: {result.holder_name}</span>
                <p style={{ fontSize: '12px', color: 'rgba(245,240,235,0.35)', marginTop: '8px' }}>
                  This certificate verifies the authenticity of a ColorOut&#8482; tattoo by Patrick Cat.
                </p>
              </div>
            )}
          </div>
        )}

        {notFound && (
          <div className="result-not-found" style={{ display: 'block' }}>
            Passport code not found. Please verify your code and try again.
          </div>
        )}
      </section>

      {/* GALLERY */}
      <section className="section" id="gallery">
        <div className="section-label">Archive</div>
        <h2 className="section-title">ColorOut&#8482; Gallery</h2>
        <p className="section-body">A selection of authenticated ColorOut&#8482; tattoos, each one a unique work of living art.</p>
        <div className="gallery-grid">
          {gallery.length === 0 ? (
            <div className="gallery-loading">LOADING...</div>
          ) : (
            gallery.map((item) => (
              <div key={item.id || item.code} className="gallery-item">
                {item.image_url ? (
                  <img src={item.image_url} alt={`ColorOut ${item.code}`} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(245,240,235,0.03)' }} />
                )}
                <div className="gallery-overlay">
                  <div className="gallery-code">{item.code}</div>
                  <div className="gallery-location">&#128205; {item.city || ''}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="section" id="benefits">
        <div className="section-label cyan">Exclusive</div>
        <h2 className="section-title">Passport Benefits</h2>
        <p className="section-body" style={{ marginBottom: '40px' }}>
          Exclusive access for ColorOut&#8482; holders, connecting a global community of color collectors.
        </p>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">&#9889;</div>
            <div className="benefit-title">Priority Booking</div>
            <div className="benefit-desc">First access to Patrick Cat&#39;s calendar across SLC, Seattle, Portland, NYC, San Francisco, and guest spots worldwide.</div>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">&#9673;</div>
            <div className="benefit-title">Collector Community</div>
            <div className="benefit-desc">Join a private network of ColorOut&#8482; holders, exclusive events, early access to PumpSkins drops, and exhibition invites.</div>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">&#10022;</div>
            <div className="benefit-title">Living Provenance</div>
            <div className="benefit-desc">Your passport is a permanent record, a digital certificate linking your tattoo to the ColorOut&#8482; archive with full artist authentication.</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Have a ColorOut&#8482; tattoo?</h2>
          <p className="cta-text">
            If you&#39;ve received a ColorOut&#8482; tattoo and don&#39;t have your passport yet, request your certificate of authenticity and join the community.
          </p>
          <button className="btn-primary" onClick={() => alert('Claim form coming soon.')}>
            Claim Your Passport
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-brand">ColorOut&#8482;</div>
        <div className="footer-sub">Preserving Color as Preserving Humanity</div>
        <div className="footer-links">
          <a href="https://www.instagram.com/patrickcat_art/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://mixiartstudio.us" target="_blank" rel="noopener noreferrer">Mixi Art Studio</a>
          <a href="https://patrickcat.com" target="_blank" rel="noopener noreferrer">patrickcat.com</a>
        </div>
        <p className="footer-copy">&copy; 2025 Mixi Art Studio LLC. All rights reserved.</p>
      </footer>
    </>
  );
}
