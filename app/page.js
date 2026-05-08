'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Shield, Users, Sparkles, Calendar, MapPin, ExternalLink } from 'lucide-react';
import ClaimPassportForm from './ClaimPassportForm';

// Supabase Configuration
const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

export default function Home() {
  const [passportCode, setPassportCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [totalPassports, setTotalPassports] = useState(70);
  const [galleryItems, setGalleryItems] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);

  // Fetch total passports count on load
  useEffect(() => {
    fetchTotalCount();
    fetchGalleryItems();
  }, []);

  // Initialize 3D logo
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => {
      initThreeDLogo();
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initThreeDLogo = () => {
    if (typeof THREE === 'undefined') return;

    const container = document.getElementById('logo-3d-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const loader = new THREE.FontLoader();
    const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json';

    let textGroup = new THREE.Group();
    scene.add(textGroup);
    let letterMeshes = [];

    loader.load(fontUrl, function (font) {
      const text = 'ColorOut™';
      const size = 1.6;
      const depth = 0.6;
      let offsetX = 0;
      const spacing = 0.12;

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const charSize = (ch === '™') ? size * 0.45 : size;
        const charDepth = (ch === '™') ? depth * 0.6 : depth;
        const geo = new THREE.TextGeometry(ch, {
          font: font,
          size: charSize,
          height: charDepth,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.015,
          bevelSegments: 3
        });
        geo.computeBoundingBox();
        const w = geo.boundingBox.max.x - geo.boundingBox.min.x;

        const mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.25,
          metalness: 0.15
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = offsetX;
        if (ch === '™') mesh.position.y = charSize * 0.95;
        textGroup.add(mesh);
        letterMeshes.push({ mesh, mat, index: i, total: text.length });
        offsetX += w + spacing;
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

    let autoSpeed = 0.012;
    let rainbowSpeed = 0.010;
    let time = 0;

    const color = new THREE.Color();

    function animate() {
      requestAnimationFrame(animate);
      time += 1;

      textGroup.rotation.y += autoSpeed;

      letterMeshes.forEach(({ mat, index, total }) => {
        const hue = ((time * rainbowSpeed) + (index / total)) % 1;
        color.setHSL(hue, 0.85, 0.55);
        mat.color.copy(color);
      });

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  };

  const fetchTotalCount = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passports?select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'count=exact'
          }
        }
      );

      const count = response.headers.get('content-range');
      if (count) {
        const total = parseInt(count.split('/')[1]);
        setTotalPassports(total);
      } else {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setTotalPassports(data.length);
        }
      }
    } catch (error) {
      console.error('Error fetching count:', error);
    }
  };

  const fetchGalleryItems = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passports?select=*&order=code.asc&limit=6`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();

      const items = data.map((item, idx) => ({
        id: item.id,
        code: item.code,
        city: item.city,
        holder_name: item.holder_name,
        image_url: item.image_url
      }));

      setGalleryItems(items);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResult(null);

    try {
      const searchCode = passportCode.toUpperCase().trim();
      const url = `${SUPABASE_URL}/rest/v1/passports?code=eq.${searchCode}&select=*`;

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data && data.length > 0) {
        setSearchResult({
          code: data[0].code,
          date: data[0].date,
          city: data[0].city,
          holder: data[0].holder_name,
          image: data[0].image_url
        });
      } else {
        setSearchResult('not-found');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResult({
        error: true,
        message: error.message
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');

        body {
          font-family: 'Inter', sans-serif;
          background: #0a0a0a;
          color: white;
          overflow-x: hidden;
        }

        @keyframes meshFlow {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        @keyframes rainbowFlow {
          to { background-position: 200% center; }
        }

        .rainbow-mesh {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(255, 0, 128, 0.3), transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.3), transparent 40%),
            radial-gradient(circle at 50% 70%, rgba(255, 237, 0, 0.3), transparent 40%),
            radial-gradient(circle at 10% 80%, rgba(161, 0, 255, 0.3), transparent 40%);
          background-size: 200% 200%;
          animation: meshFlow 20s ease infinite;
          filter: blur(80px);
          opacity: 0.4;
          z-index: 0;
        }

        .content {
          position: relative;
          z-index: 1;
        }

        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        #logo-3d-container {
          width: 100%;
          max-width: 800px;
          height: 400px;
          position: relative;
          margin-bottom: 2rem;
        }

        .hero-video-container {
          width: 100%;
          max-width: 900px;
          margin: 2rem auto;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .hero-video-container::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 2px;
          background: linear-gradient(
            135deg,
            rgba(255, 0, 128, 0.6),
            rgba(255, 237, 0, 0.6),
            rgba(0, 255, 65, 0.6),
            rgba(0, 184, 255, 0.6)
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.5;
          z-index: 1;
          pointer-events: none;
        }

        .hero-video {
          width: 100%;
          height: auto;
          display: block;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          text-align: center;
          margin-top: 2rem;
          background: linear-gradient(
            90deg,
            #ff0080,
            #ff8c00,
            #ffed00,
            #00ff41,
            #00b8ff,
            #a100ff,
            #ff0080
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: rainbowFlow 5s linear infinite;
        }

        .hero-subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          max-width: 600px;
          margin: 1rem auto;
          line-height: 1.6;
        }

        .stats {
          display: flex;
          gap: 4rem;
          margin-top: 3rem;
        }

        .stat {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2rem 3rem;
          border-radius: 30px;
          text-align: center;
        }

        .stat-number {
          font-size: 4rem;
          font-weight: 800;
          background: linear-gradient(90deg, #ff0080, #ffed00, #00ff41, #00b8ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-top: 0.5rem;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          position: relative;
        }

        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(255, 0, 128, 0.5),
            rgba(255, 237, 0, 0.5),
            rgba(0, 255, 65, 0.5),
            rgba(0, 184, 255, 0.5)
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0.3;
        }

        .verify-section {
          padding: 6rem 2rem;
        }

        .section-title {
          font-size: 3rem;
          font-weight: 800;
          text-align: center;
          margin-bottom: 1rem;
          background: linear-gradient(90deg, #ff0080, #ffed00, #00ff41);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-subtitle {
          text-align: center;
          color: rgba(255, 255, 255, 0.6);
          font-size: 1.1rem;
          margin-bottom: 3rem;
        }

        .search-container {
          display: flex;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          padding: 0.5rem;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 700px;
          margin: 0 auto;
        }

        .search-input {
          flex: 1;
          padding: 1.2rem 2rem;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 100px;
          font-family: 'Inter', monospace;
          font-size: 1rem;
          text-transform: uppercase;
          font-weight: 600;
          color: white;
        }

        .search-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .search-button {
          padding: 1.2rem 3rem;
          background: linear-gradient(90deg, #ff0080, #ff8c00, #ffed00, #00ff41, #00b8ff, #a100ff);
          background-size: 200% auto;
          animation: rainbowFlow 3s linear infinite;
          border: none;
          border-radius: 100px;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .search-button:hover {
          transform: scale(1.05);
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .gallery-section {
          padding: 6rem 2rem;
        }

        .gallery-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .gallery-item {
          aspect-ratio: 1;
          border-radius: 30px;
          overflow: hidden;
          position: relative;
          cursor: pointer;
          transition: transform 0.3s;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .gallery-item::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 30px;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255, 0, 128, 0.6), rgba(255, 237, 0, 0.6), rgba(0, 255, 65, 0.6));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .gallery-item:hover::before {
          opacity: 1;
        }

        .gallery-item:hover {
          transform: translateY(-10px);
        }

        .gallery-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .gallery-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.8));
          padding: 2rem;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          opacity: 0;
          transition: opacity 0.3s;
        }

        .gallery-item:hover .gallery-overlay {
          opacity: 1;
        }

        .gallery-code {
          font-weight: 800;
          background: linear-gradient(90deg, #ff0080, #ffed00, #00ff41);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
        }

        .gallery-location {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .benefits-section {
          padding: 6rem 2rem;
        }

        .benefits-grid {
          max-width: 1200px;
          margin: 3rem auto 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .benefit-card {
          padding: 3rem;
          transition: transform 0.3s;
        }

        .benefit-card:hover {
          transform: translateY(-5px);
        }

        .benefit-icon {
          width: 70px;
          height: 70px;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, rgba(255, 0, 128, 0.3), rgba(0, 255, 65, 0.3));
          backdrop-filter: blur(10px);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .benefit-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 1rem;
          color: white;
        }

        .benefit-description {
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
        }

        .cta-section {
          padding: 6rem 2rem;
        }

        .cta-box {
          max-width: 700px;
          margin: 0 auto;
          padding: 4rem;
          text-align: center;
        }

        .cta-title {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(90deg, #ff0080, #ffed00, #00ff41);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
        }

        .cta-text {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .cta-button {
          padding: 1.5rem 4rem;
          background: linear-gradient(90deg, #ff0080, #ff8c00, #ffed00, #00ff41, #00b8ff, #a100ff);
          background-size: 200% auto;
          animation: rainbowFlow 3s linear infinite;
          border: none;
          border-radius: 100px;
          color: white;
          font-size: 1.2rem;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .cta-button:hover {
          transform: scale(1.05);
        }

        .footer {
          padding: 3rem 2rem;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .footer-text {
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.5rem;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }

          .stats {
            flex-direction: column;
            gap: 1rem;
          }

          .search-container {
            flex-direction: column;
          }

          .cta-box {
            padding: 3rem 2rem;
          }
        }
      `}</style>

      <div className="rainbow-mesh"></div>

      <div className="content">
        {/* Hero */}
        <section className="hero">
          <div id="logo-3d-container"></div>

          {/* Hero Video */}
          <div className="hero-video-container">
            <video
              className="hero-video"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/colorout-video.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <h1 className="hero-title">Certificate of Authenticity</h1>
          <p className="hero-subtitle">
            Each ColorOut™ tattoo is a unique work of art, documented and authenticated
            with a permanent certificate of provenance.
          </p>
          <div className="stats">
            <div className="stat">
              <div className="stat-number">{totalPassports}</div>
              <div className="stat-label">ColorOut™ Tattoos</div>
            </div>
            <div className="stat">
              <div className="stat-number">6</div>
              <div className="stat-label">Cities Worldwide</div>
            </div>
          </div>
        </section>

        {/* Verify */}
        <section className="verify-section">
          <h2 className="section-title">Verify Your Passport</h2>
          <p className="section-subtitle">Enter your unique ColorOut™ code</p>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="CO-2026-0001"
              value={passportCode}
              onChange={(e) => setPassportCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="search-button"
            >
              {isSearching ? (
                <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <Search style={{ width: '20px', height: '20px', display: 'inline', marginRight: '8px' }} />
                  VERIFY
                </>
              )}
            </button>
          </div>

          {/* Search Results */}
          {searchResult && (
            <div style={{ maxWidth: '700px', margin: '2rem auto' }}>
              {searchResult === 'not-found' ? (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                  <p style={{ color: '#ff6b6b' }}>Passport code not found. Please verify your code and try again.</p>
                </div>
              ) : searchResult.error ? (
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <p style={{ color: '#ffd93d', marginBottom: '0.5rem' }}>Error connecting to database:</p>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>{searchResult.message}</p>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: '2rem' }}>
                  {searchResult.image && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <img
                        src={searchResult.image}
                        alt={`ColorOut™ ${searchResult.code}`}
                        style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '20px' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Authenticated</div>
                      <div style={{ fontSize: '2rem', fontWeight: '800', color: 'white' }}>
                        {searchResult.code}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(0,255,100,0.2)', border: '1px solid rgba(0,255,100,0.5)', borderRadius: '100px', padding: '0.5rem 1rem', color: '#00ff64', fontSize: '0.9rem' }}>
                      ✓ Verified
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Calendar style={{ width: '20px', height: '20px', color: 'white' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Date</div>
                        <div style={{ color: 'white' }}>{searchResult.date}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <MapPin style={{ width: '20px', height: '20px', color: 'white' }} />
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Location</div>
                        <div style={{ color: 'white' }}>{searchResult.city}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>Holder: {searchResult.holder}</p>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                      This certificate verifies the authenticity of a ColorOut™ tattoo by Patrick Cat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Gallery */}
        <section className="gallery-section">
          <h2 className="section-title">ColorOut™ Gallery</h2>
          <p className="section-subtitle">A selection of authenticated ColorOut™ tattoos</p>
          {galleryItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Loading gallery...</div>
          ) : (
            <div className="gallery-grid">
              {galleryItems.map((item) => (
                <div key={item.id} className="gallery-item">
                  {item.image_url ? (
                    <img src={item.image_url} alt={`ColorOut™ ${item.code}`} />
                  ) : (
                    <div style={{ background: 'rgba(255,255,255,0.05)' }} />
                  )}
                  <div className="gallery-overlay">
                    <div className="gallery-code">{item.code}</div>
                    <div className="gallery-location">
                      <MapPin style={{ width: '16px', height: '16px', display: 'inline', marginRight: '4px' }} />
                      {item.city}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/gallery" style={{ color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8, transition: 'opacity 0.2s' }}>
              <span>View Full Collection</span>
              <ExternalLink style={{ width: '16px', height: '16px' }} />
            </Link>
          </div>
        </section>

        {/* Benefits */}
        <section className="benefits-section">
          <h2 className="section-title">Passport Benefits</h2>
          <p className="section-subtitle">Exclusive access for ColorOut™ holders</p>
          <div className="benefits-grid">
            {[
              {
                icon: <Sparkles style={{ width: '32px', height: '32px' }} />,
                title: "Priority Booking",
                description: "Get first access to Patrick Cat's calendar in SLC, Seattle, Portland, NYC, and San Francisco"
              },
              {
                icon: <Users style={{ width: '32px', height: '32px' }} />,
                title: "Exclusive Community",
                description: "Join a private Discord with fellow ColorOut™ holders and participate in exclusive events"
              },
              {
                icon: <Shield style={{ width: '32px', height: '32px' }} />,
                title: "Early Access",
                description: "First look at PumpSkins drops, exhibition invites, and behind-the-scenes content"
              }
            ].map((benefit, idx) => (
              <div key={idx} className="benefit-card glass-card">
                <div className="benefit-icon">{benefit.icon}</div>
                <h3 className="benefit-title">{benefit.title}</h3>
                <p className="benefit-description">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-box glass-card">
            <h2 className="cta-title">Have a ColorOut™ tattoo?</h2>
            <p className="cta-text">
              If you've received a ColorOut™ tattoo and don't have your passport yet,
              request your certificate of authenticity and join the community.
            </p>
            <button onClick={() => setShowClaimForm(true)} className="cta-button">
              CLAIM YOUR PASSPORT
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p className="footer-text">ColorOut™ by Patrick Cat</p>
          <p className="footer-text">Preserving color as preserving humanity</p>
          <p className="footer-text" style={{ opacity: 0.3 }}>© 2025 Mixi Art Studio. All rights reserved.</p>
        </footer>
      </div>

      {showClaimForm && (
        <ClaimPassportForm onClose={() => setShowClaimForm(false)} />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
