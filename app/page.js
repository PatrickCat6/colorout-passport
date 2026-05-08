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

  useEffect(() => {
    // Load Three.js and initialize 3D logo
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
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);

    const loader = new THREE.FontLoader();
    const fontUrl = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json';

    let textGroup = new THREE.Group();
    scene.add(textGroup);
    let letterMeshes = [];

    loader.load(fontUrl, function (font) {
      const text = 'ColorOut™';
      const size = 0.7;
      const depth = 0.25;
      let offsetX = 0;
      const spacing = 0.05;

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

    let autoSpeed = 0.012; // rotate speed 6
    let rainbowSpeed = 0.010; // rainbow speed 10
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

  return (
    <div className="min-h-screen">
      {/* Hero Section - WHITE BACKGROUND */}
      <div className="relative bg-white text-black">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center space-y-6">
            {/* 3D Logo */}
            <div className="mb-8">
              <div 
                id="logo-3d-container" 
                style={{ 
                  width: '100%', 
                  height: '300px', 
                  position: 'relative'
                }}
              />
            </div>
            
            <h2 className="text-3xl font-light tracking-wide text-gray-700">
              Certificate of Authenticity
            </h2>
            
            <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Each ColorOut™ tattoo is a unique work of art, documented and authenticated 
              with a permanent certificate of provenance. Join an exclusive community of collectors 
              preserving color as preserving humanity.
            </p>

            {/* Stats */}
            <div className="pt-8 flex justify-center gap-12">
              <div>
                <div className="text-5xl font-light text-black">
                  {totalPassports}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                  ColorOut™ Tattoos
                </div>
              </div>
              <div>
                <div className="text-5xl font-light text-black">
                  6
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                  Cities Worldwide
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passport Lookup Section - BLACK BACKGROUND */}
      <div className="bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12">
            <div className="text-center mb-8">
              <Shield className="w-12 h-12 mx-auto mb-4 text-white" />
              <h3 className="text-2xl font-light mb-2">Verify Your Passport</h3>
              <p className="text-gray-400">Enter your unique ColorOut™ code</p>
            </div>

            <div className="flex gap-3 max-w-xl mx-auto">
              <input
                type="text"
                placeholder="CO-LEGACY-0001"
                value={passportCode}
                onChange={(e) => setPassportCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 bg-black border border-gray-700 rounded-lg px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors uppercase"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Verify
                  </>
                )}
              </button>
            </div>

            {/* Search Results */}
            {searchResult && (
              <div className="mt-8">
                {searchResult === 'not-found' ? (
                  <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-6 text-center">
                    <p className="text-red-400">Passport code not found. Please verify your code and try again.</p>
                  </div>
                ) : searchResult.error ? (
                  <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-lg p-6">
                    <p className="text-yellow-400 mb-2">Error connecting to database:</p>
                    <p className="text-sm text-gray-400 font-mono">{searchResult.message}</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
                    {searchResult.image && (
                      <div className="mb-6">
                        <img 
                          src={searchResult.image} 
                          alt={`ColorOut™ ${searchResult.code}`}
                          className="w-full h-96 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Authenticated</div>
                        <div className="text-3xl font-light text-white">
                          {searchResult.code}
                        </div>
                      </div>
                      <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-1 text-green-400 text-sm">
                        ✓ Verified
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Date</div>
                          <div className="text-white">{searchResult.date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-white" />
                        <div>
                          <div className="text-xs text-gray-500 uppercase">Location</div>
                          <div className="text-white">{searchResult.city}</div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-700 my-6" />

                    <div className="text-center">
                      <p className="text-gray-400 mb-4">Holder: {searchResult.holder}</p>
                      <p className="text-sm text-gray-500">
                        This certificate verifies the authenticity of a ColorOut™ tattoo by Patrick Cat.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Section - WHITE BACKGROUND */}
      <div className="bg-white text-black">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-light mb-4">ColorOut™ Gallery</h3>
            <p className="text-gray-600">A selection of authenticated ColorOut™ tattoos</p>
          </div>

          {galleryItems.length === 0 ? (
            <div className="text-center text-gray-500">Loading gallery...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryItems.map((item) => (
                <div 
                  key={item.id}
                  className="group relative aspect-square bg-gray-100 border border-gray-300 rounded-xl overflow-hidden hover:border-black transition-all duration-300 cursor-pointer"
                >
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={`ColorOut™ ${item.code}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200" />
                  )}

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="space-y-2">
                      <div className="text-sm font-mono text-white font-semibold">{item.code}</div>
                      <div className="flex items-center gap-2 text-gray-200">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{item.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link
              href="/gallery"
              className="text-black hover:text-gray-600 transition-colors flex items-center gap-2 mx-auto inline-flex"
            >
              <span>View Full Collection</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Benefits Section - BLACK BACKGROUND */}
      <div className="bg-black text-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-light mb-4">Passport Benefits</h3>
            <p className="text-gray-400">Exclusive access for ColorOut™ holders</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Priority Booking",
                description: "Get first access to Patrick Cat's calendar in SLC, Seattle, Portland, NYC, and San Francisco"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Exclusive Community",
                description: "Join a private Discord with fellow ColorOut™ holders and participate in exclusive events"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Early Access",
                description: "First look at PumpSkins drops, exhibition invites, and behind-the-scenes content"
              }
            ].map((benefit, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-white transition-colors">
                <div className="text-white mb-4">{benefit.icon}</div>
                <h4 className="text-xl font-light mb-3">{benefit.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section - WHITE BACKGROUND */}
      <div className="bg-white text-black">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="bg-gray-100 border border-gray-300 rounded-2xl p-12 text-center">
            <h3 className="text-3xl font-light mb-4">Have a ColorOut™ tattoo?</h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              If you've received a ColorOut™ tattoo and don't have your passport yet, 
              request your certificate of authenticity and join the community.
            </p>
            <button 
              onClick={() => setShowClaimForm(true)}
              className="bg-black text-white hover:bg-gray-800 px-8 py-4 rounded-lg font-medium transition-all text-lg"
            >
              Claim Your Passport
            </button>
          </div>
        </div>
      </div>

      {showClaimForm && (
        <ClaimPassportForm onClose={() => setShowClaimForm(false)} />
      )}

      {/* Footer - BLACK BACKGROUND */}
      <div className="bg-black border-t border-gray-900 py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="text-sm text-gray-600 space-y-2">
            <p>ColorOut™ by Patrick Cat</p>
            <p>Preserving color as preserving humanity</p>
            <p className="text-gray-700">© 2025 Mixi Art Studio. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
