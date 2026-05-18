'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import ClaimPassportForm from './ClaimPassportForm';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

export default function Home() {
  const logoRef = useRef(null);
  const threeInited = useRef(false);
  const [totalCount, setTotalCount] = useState('...');
  const [gallery, setGallery] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showClaim, setShowClaim] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?select=*`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Prefer: 'count=exact' },
        });
        const c = r.headers.get('content-range');
        let total = 70;
        if (c) total = parseInt(c.split('/')[1]) || 70;
        else { const d = await r.json(); if (Array.isArray(d)) total = d.length; }
        setTotalCount(total);
      } catch (e) { console.error(e); }
    })();
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?select=*&order=code.asc&limit=6`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        });
        const data = await r.json();
        if (Array.isArray(data)) setGallery(data);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    document.body.style.overflow = (menuOpen || showClaim) ? 'hidden' : '';
  }, [menuOpen, showClaim]);

  const handleSearch = useCallback(async () => {
    const code = searchCode.toUpperCase().trim();
    if (!code) return;
    setResult(null); setNotFound(false);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?code=eq.${code}&select=*`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      if (data && data.length > 0) setResult(data[0]);
      else setNotFound(true);
    } catch (e) { console.error(e); }
  }, [searchCode]);

  const initThreeDLogo = useCallback(() => {
    const THREE = window.THREE;
    if (!THREE || !logoRef.current || threeInited.current) return;
    threeInited.current = true;
    const container = logoRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 10);
    camera.lookAt(0, 1, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x222244, 0.4));
    const spot1 = new THREE.PointLight(0xff00ff, 1.8, 22); spot1.position.set(5, 6, 4); scene.add(spot1);
    const spot2 = new THREE.PointLight(0x00ffff, 1.4, 22); spot2.position.set(-5, 2, 5); scene.add(spot2);
    const spot3 = new THREE.PointLight(0xffff00, 0.9, 16); spot3.position.set(0, -3, 5); scene.add(spot3);
    const spot4 = new THREE.PointLight(0x8833ff, 1.0, 18); spot4.position.set(-3, 7, -4); scene.add(spot4);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(2, 8, 3); scene.add(dir);

    const group = new THREE.Group(); scene.add(group);

    const iriVert = 'varying vec3 vN, vV, vW; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; vN = normalize(normalMatrix * normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }';
    const iriFrag = 'uniform float uTime; varying vec3 vN, vV, vW; void main(){ float fresnel = pow(1.0 - max(dot(vN,vV),0.0), 2.5); float shift = dot(vN,vV)*4.0 + uTime*0.45 + vW.y*0.5 + vW.x*0.25; vec3 c1=vec3(1.0,0.15,0.75), c2=vec3(0.15,0.85,1.0), c3=vec3(1.0,0.88,0.1), c4=vec3(0.35,1.0,0.45), c5=vec3(0.6,0.2,1.0); float s = mod(shift, 5.0); vec3 c; if(s<1.0) c=mix(c1,c2,fract(s)); else if(s<2.0) c=mix(c2,c3,fract(s)); else if(s<3.0) c=mix(c3,c4,fract(s)); else if(s<4.0) c=mix(c4,c5,fract(s)); else c=mix(c5,c1,fract(s)); c = c*(0.4+fresnel*0.65); c += fresnel*vec3(0.75,0.8,1.0)*0.45; vec3 r = reflect(-vV,vN); c += pow(max(r.y,0.0),14.0)*vec3(1.0,0.95,0.9)*0.3; gl_FragColor = vec4(c,1.0); }';
    const uT = { uTime: { value: 0 } };
    const matIri = new THREE.ShaderMaterial({ vertexShader: iriVert, fragmentShader: iriFrag, uniforms: uT });

    function addBody(geo, opts) {
      const mesh = new THREE.Mesh(geo, matIri);
      if (opts && opts.pos) mesh.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
      group.add(mesh); return mesh;
    }

    addBody(new THREE.CylinderGeometry(0.09, 2.2, 3.2, 7, 1), { pos: [0, -0.1, 0] });
    addBody(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 6), { pos: [0, 1.8, 0] });

    const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa22, metalness: 0.5, roughness: 0.25 });
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), headMat);
    head.position.set(0, 2.45, 0); head.scale.set(1.1, 0.65, 0.88); group.add(head);

    const earGeo = new THREE.ConeGeometry(0.34, 0.58, 4, 1);
    const earMat = new THREE.MeshStandardMaterial({ color: 0x00ddcc, metalness: 0.55, roughness: 0.25 });
    const earL = new THREE.Mesh(earGeo, earMat); earL.position.set(-0.45, 2.87, 0); earL.rotation.z = 0.5; group.add(earL);
    const earR = new THREE.Mesh(earGeo, earMat); earR.position.set(0.45, 2.87, 0); earR.rotation.z = -0.5; group.add(earR);

    const eyeGeo = new THREE.SphereGeometry(0.1, 16, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.0 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.32, 2.42, 0.5); group.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat); eyeR.position.set(0.32, 2.42, 0.5); group.add(eyeR);

    const noseMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.4, roughness: 0.3 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), noseMat);
    nose.position.set(0, 2.22, 0.52); nose.scale.set(1.4, 0.7, 0.6); group.add(nose);

    const hornMat = new THREE.MeshStandardMaterial({ color: 0x44eeee, metalness: 0.65, roughness: 0.18 });
    function makeHorn(side) {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const t = i / 14;
        const x = side * (0.45 + Math.sin(t * Math.PI * 0.5) * 0.45);
        const y = 2.7 + t * t * 1.2;
        const z = -0.15 - Math.sin(t * Math.PI) * 0.15;
        pts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = new THREE.TubeGeometry(curve, 14, 0.14, 6, false);
      group.add(new THREE.Mesh(tubeGeo, hornMat));
      const tipGeo = new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, hornMat);
      const endPt = curve.getPoint(1); const endTan = curve.getTangent(1);
      tip.position.copy(endPt);
      tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endTan);
      group.add(tip);
    }
    makeHorn(-1); makeHorn(1);
    group.position.y = -0.1;

    const autoSpeed = 6 * 0.002;
    let isDragging = false, prevX = 0, prevY = 0;
    container.style.cursor = 'grab';
    const onDown = (e) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; container.style.cursor = 'grabbing'; };
    const onMove = (e) => { if (!isDragging) return; group.rotation.y += (e.clientX - prevX) * 0.008; group.rotation.x += (e.clientY - prevY) * 0.006; prevX = e.clientX; prevY = e.clientY; };
    const onUp = () => { isDragging = false; container.style.cursor = 'grab'; };
    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.016;
      uT.uTime.value = time;
      if (!isDragging) group.rotation.y += autoSpeed;
      spot1.intensity = 1.8 + Math.sin(time * 1.1) * 0.4;
      spot2.intensity = 1.4 + Math.sin(time * 0.8 + 1) * 0.4;
      spot4.intensity = 1.0 + Math.sin(time * 0.6 + 2) * 0.3;
      renderer.render(scene, camera);
    }
    animate();
    const onResize = () => { camera.aspect = container.clientWidth / container.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(container.clientWidth, container.clientHeight); };
    window.addEventListener('resize', onResize);
  }, []);

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="afterInteractive" onLoad={initThreeDLogo} />

      <div className="spectrum-bar" />

      <nav>
        <div className="nav-logo" style={{ fontSize: '17px' }}>COLOROUT&#8482;</div>
        <div className="nav-links">
          <a href="#about">About</a>
          <a href="#verify">Verify</a>
          <a href="/gallery">Gallery</a>
          <a href="#benefits">Benefits</a>
        </div>
        <button className="nav-menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>MENU</button>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-header">
          <div className="nav-logo">ColorOut&#8482; <span className="nav-artist">by Patrick Cat</span></div>
          <button className="nav-menu-btn" aria-label="Close menu" onClick={() => setMenuOpen(false)}>CLOSE</button>
        </div>
        <div className="mobile-menu-links">
          <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
          <a href="#verify" onClick={() => setMenuOpen(false)}>Verify</a>
          <a href="/gallery" onClick={() => setMenuOpen(false)}>Gallery</a>
          <a href="#benefits" onClick={() => setMenuOpen(false)}>Benefits</a>
        </div>
        <div className="mobile-menu-footer">
          <a href="https://www.instagram.com/patrickcat_art/" target="_blank" rel="noopener noreferrer">Instagram &#8599;</a>
          <span>NYC &middot; EST. 2020</span>
        </div>
      </div>

      <section className="hero">
        <div className="hero-bg-grid" />
        <div className="hero-left">
          <div className="hero-giant-text">
            <span className="line-white">Color</span><br />
            <span className="line-white">Out</span>
            <span className="hero-year" style={{ fontSize: '20.3568px', opacity: 0.5 }}>TM</span>
          </div>
          <div className="hero-tagline" style={{ lineHeight: 1.5 }}>
            ColorOut Passport is a certificate of authenticity system for tattoos by Patrick Cat
          </div>
          <div className="hero-desc">
            Each tattoo is a unique work of art, documented and authenticated with a permanent certificate of provenance. Preserving color is preserving humanity.
          </div>
          <div className="hero-cta-row">
            <a
              href="https://www.instagram.com/patrickcat_art/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-instagram"
              style={{ backgroundColor: 'rgb(0, 0, 0)', borderColor: 'rgb(255, 255, 255)' }}
            >
              ✦ <span style={{ color: 'rgb(255, 255, 255)' }}>INSTAGRAM</span>
            </a>
            <a href="#verify" className="btn-verify-link">Verify Passport</a>
          </div>
        </div>
        <div className="hero-right">
          <img src="https://cdn.prod.website-files.com/69af75f4cb0da0cb8e4b814c/69feb2b39ba97bfde8e00ce7_Untitled%20design.PNG" alt="ColorOut by Patrick Cat" />
        </div>
      </section>

      <div className="stats-strip">
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

      <div className="logo-strip" ref={logoRef} />

      <section className="statement-section" id="about">
        <div>
          <div className="section-label">The Concept</div>
          <div className="statement-quote">
            Color inhabits and co-inhabits spaces and objects, as well as emotions and memories that shape dreams. Preserving color is preserving our capacity to feel, to dream, and to be.
          </div>
        </div>
        <div className="statement-body">
          <p>ColorOut&#8482; is a multidisciplinary artistic project that uses color as a living language to create immersive experiences through tattoos, paintings, and sculptures. It seeks to connect dimensions: two-dimensional, three-dimensional, digital, and tactile in a cyclical process that transcends limits.</p>
          <p>The skin, as a living canvas and organic Wunderkammer, becomes a unique exhibition space where the tattoo integrates color into the body, fusing it with the wearer&#39;s identity.</p>
          <p>In opposition to the monochromatic, which limits humans from their essence, ColorOut&#8482; celebrates color as a universal vehicle that unites the personal with the collective.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-label cyan">The Process<span style={{ color: '#ff2d7b' }}></span></div>
        <h2 className="section-title">From Skin to Archive</h2>
        <p className="section-body" style={{ marginBottom: '48px' }}>Every ColorOut&#8482; tattoo follows a deliberate, freehand process, finding the movement of color across the body, creating chromatic transitions that convey the joy of color as a lived experience.</p>
        <div className="concept-grid">
          <div className="concept-card"><div className="concept-card-number">01</div><h3>Freehand Mapping</h3><p>Each piece begins with a direct, intuitive drawing on skin, finding the natural movement and flow of color across the body&#39;s unique contours. No stencils. Pure dialogue between artist and canvas.</p></div>
          <div className="concept-card"><div className="concept-card-number">02</div><h3>Chromatic Saturation</h3><p>Layers of vibrant color are built using Patrick&#39;s signature spectrum, a full-body approach where color transcends illustration and becomes an immersive experience.</p></div>
          <div className="concept-card"><div className="concept-card-number">03</div><h3>Passport Issuance</h3><p>Upon completion, each work is documented with a unique ColorOut&#8482; Passport code, photograph, date, and location, creating a permanent certificate of provenance.</p></div>
        </div>
      </section>

      <section className="verify-section" id="verify">
        <div className="section-label green">Authenticate<span style={{ color: '#ff2d7b' }}></span></div>
        <h2 className="section-title">Verify Your Passport</h2>
        <p className="section-body">Enter your unique ColorOut&#8482; code to verify the authenticity of your tattoo and access your certificate of provenance.</p>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="CO-2026-0001"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <button className="search-button" onClick={handleSearch}>&#128269; Verify</button>
        </div>
        {result && (
          <div className="result-card visible">
            {result.image_url && <img src={result.image_url} alt={`ColorOut ${result.code}`} />}
            <div className="result-verified">&#10003; Verified Authentic</div>
            <div className="result-code">{result.code}</div>
            <div className="result-meta">
              <div className="result-meta-item"><label>Date</label><span>{result.date || '...'}</span></div>
              <div className="result-meta-item"><label>Location</label><span>{result.city || '...'}</span></div>
            </div>
            <div className="result-holder">
              <span>{result.holder_name ? `Holder: ${result.holder_name}` : ''}</span>
              <p style={{ fontSize: '12px', color: 'rgba(10,10,10,0.35)', marginTop: '8px' }}>This certificate verifies the authenticity of a ColorOut&#8482; tattoo by Patrick Cat.</p>
            </div>
          </div>
        )}
        {notFound && <div className="result-not-found visible">Passport code not found. Please verify your code and try again.</div>}
      </section>

      <section className="section" id="gallery">
        <div className="section-label">Archive</div>
        <h2 className="section-title">ColorOut&#8482; Gallery</h2>
        <p className="section-body">A selection of authenticated ColorOut&#8482; tattoos, each one a unique work of living art.</p>
        <div className="gallery-grid">
          {gallery.length === 0 ? (
            <div className="gallery-loading">LOADING...</div>
          ) : gallery.map((item) => (
            <div key={item.id || item.code} className="gallery-item">
              {item.image_url ? <img src={item.image_url} alt={`ColorOut ${item.code}`} /> : <div style={{ width: '100%', height: '100%', background: 'rgba(10,10,10,0.03)' }} />}
              <div className="gallery-overlay">
                <div className="gallery-code">{item.code}</div>
                <div className="gallery-location">&#128205; {item.city || ''}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <a href="/gallery" className="btn-verify-link" style={{ display: 'inline-block' }}>View Full Archive →</a>
        </div>
      </section>

      <section className="section" id="benefits">
        <div className="section-label cyan">Exclusive<span style={{ color: '#ff2d7b' }}></span></div>
        <h2 className="section-title">Passport Benefits</h2>
        <p className="section-body" style={{ marginBottom: '40px' }}>Exclusive access for ColorOut&#8482; holders, connecting a global community of color collectors.</p>
        <div className="benefits-grid">
          <div className="benefit-card"><div className="benefit-icon">&#9889;</div><div className="benefit-title">Priority Booking</div><div className="benefit-desc">First access to Patrick Cat&#39;s calendar across SLC, Seattle, Portland, NYC, San Francisco, and guest spots worldwide.</div></div>
          <div className="benefit-card"><div className="benefit-icon">&#9673;</div><div className="benefit-title">Collector Community</div><div className="benefit-desc">Join a private network of ColorOut&#8482; holders, exclusive events, early access to PumpSkins drops, and exhibition invites.</div></div>
          <div className="benefit-card"><div className="benefit-icon">&#10022;</div><div className="benefit-title">Living Provenance</div><div className="benefit-desc">Your passport is a permanent record, a digital certificate linking your tattoo to the ColorOut&#8482; archive with full artist authentication.</div></div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Have a ColorOut&#8482; tattoo?</h2>
          <p className="cta-text">If you&#39;ve received a ColorOut&#8482; tattoo and don&#39;t have your passport yet, request your certificate of authenticity and join the community.</p>
          <button className="btn-primary" onClick={() => setShowClaim(true)}>Claim Your Passport</button>
        </div>
      </section>

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

      {showClaim && <ClaimPassportForm onClose={() => setShowClaim(false)} />}
    </>
  );
}
