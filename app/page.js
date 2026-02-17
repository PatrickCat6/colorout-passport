'use client';

import React, { useState, useEffect } from 'react';
import { Search, Shield, Users, Sparkles, Calendar, MapPin, ExternalLink } from 'lucide-react';
import ClaimPassportForm from './ClaimPassportForm';

// Supabase Configuration
const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

export default function Home() {
  const [passportCode, setPassportCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [gradientPosition, setGradientPosition] = useState(0);
  const [totalPassports, setTotalPassports] = useState(70);
  const [galleryItems, setGalleryItems] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);

  // Animated gradient effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGradientPosition(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

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
      
      const colors = [
        'from-pink-500 to-purple-500',
        'from-purple-500 to-cyan-500',
        'from-cyan-500 to-green-500',
        'from-green-500 to-yellow-500',
        'from-yellow-500 to-pink-500',
        'from-pink-500 to-red-500'
      ];
      
      const items = data.map((item, idx) => ({
        id: item.id,
        code: item.code,
        city: item.city,
        color: colors[idx % colors.length],
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
    <div className="min-h-screen bg-black text-white">
      <style jsx>{`
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 400% 50%; }
        }
      `}</style>
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,0,255,0.1),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(0,255,255,0.1),transparent_50%)]" />
        
        <div className="relative max-w-6xl mx-auto px-6 py-24">
          <div className="text-center space-y-6">
            <div className="inline-block">
              <h1 className="text-7xl font-bold tracking-tight mb-2">
                <span 
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: `linear-gradient(${gradientPosition}deg, 
                      #ff0000,
                      #ff7f00,
                      #ffff00,
                      #00ff00,
                      #0000ff,
                      #8b00ff,
                      #ff0000)`,
                    backgroundSize: '400% 400%',
                    animation: 'rainbow 8s linear infinite'
                  }}
                >
                  ColorOut™
                </span>
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-30" />
            </div>
            
            <h2 className="text-3xl font-light tracking-wide text-gray-300">
              Certificate of Authenticity
            </h2>
            
            <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Each ColorOut™ tattoo is a unique work of art, documented and authenticated 
              with a permanent certificate of provenance. Join an exclusive community of collectors 
              preserving color as preserving humanity.
            </p>

            {/* Stats */}
            <div className="pt-8 flex justify-center gap-12">
              <div>
                <div className="text-5xl font-light bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">
                  {totalPassports}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider mt-1">
                  ColorOut™ Tattoos
                </div>
              </div>
              <div>
                <div className="text-5xl font-light bg-gradient-to-r from-purple-400 to-cyan-400 text-transparent bg-clip-text">
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

      {/* Passport Lookup Section */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-12">
          <div className="text-center mb-8">
            <Shield className="w-12 h-12 mx-auto mb-4 text-purple-400" />
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
              className="flex-1 bg-black border border-gray-700 rounded-lg px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors uppercase"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-8 py-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                <div className="bg-gradient-to-br from-purple-950/30 to-cyan-950/30 border border-purple-900/50 rounded-lg p-8">
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
                      <div className="text-3xl font-light bg-gradient-to-r from-pink-400 to-cyan-400 text-transparent bg-clip-text">
                        {searchResult.code}
                      </div>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-1 text-green-400 text-sm">
                      ✓ Verified
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Date</div>
                        <div className="text-white">{searchResult.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                      <div>
                        <div className="text-xs text-gray-500 uppercase">Location</div>
                        <div className="text-white">{searchResult.city}</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-6" />

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

      {/* Gallery Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-light mb-4">ColorOut™ Gallery</h3>
          <p className="text-gray-400">A selection of authenticated ColorOut™ tattoos</p>
        </div>

        {galleryItems.length === 0 ? (
          <div className="text-center text-gray-500">Loading gallery...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryItems.map((item, idx) => (
              <div 
                key={item.id}
                className="group relative aspect-square bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl overflow-hidden hover:border-purple-700 transition-all duration-300 cursor-pointer"
              >
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={`ColorOut™ ${item.code}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-30 transition-opacity`} />
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px'
                      }} />
                    </div>
                  </>
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

                {!item.image_url && (
                  <div className="absolute inset-0 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                    <div className="text-center">
                      <div className={`text-6xl font-light bg-gradient-to-br ${item.color} text-transparent bg-clip-text mb-2`}>
                        {(idx + 1).toString().padStart(2, '0')}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{item.city}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-12">
          <button className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 mx-auto">
            <span>View Full Collection</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Benefits Section */}
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
            <div key={idx} className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-8 hover:border-purple-700 transition-colors">
              <div className="text-purple-400 mb-4">{benefit.icon}</div>
              <h4 className="text-xl font-light mb-3">{benefit.title}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-800/50 rounded-2xl p-12 text-center">
          <h3 className="text-3xl font-light mb-4">Have a ColorOut™ tattoo?</h3>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            If you've received a ColorOut™ tattoo and don't have your passport yet, 
            request your certificate of authenticity and join the community.
          </p>
          <button 
            onClick={() => setShowClaimForm(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-8 py-4 rounded-lg font-medium transition-all text-lg"
          >
            Claim Your Passport
          </button>
        </div>
      </div>

      {showClaimForm && (
        <ClaimPassportForm onClose={() => setShowClaimForm(false)} />
      )}

      {/* Footer */}
      <div className="border-t border-gray-900 py-12">
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
