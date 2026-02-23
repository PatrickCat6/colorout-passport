'use client';

import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Filter, X } from 'lucide-react';
import Link from 'next/link';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

export default function GalleryPage() {
  const [passports, setPassports] = useState([]);
  const [filteredPassports, setFilteredPassports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [cities, setCities] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // desc = most recent first

  useEffect(() => {
    fetchAllPassports();
  }, [sortOrder]);

  useEffect(() => {
    applyFilters();
  }, [passports, searchCode, selectedCity]);

  const fetchAllPassports = async () => {
    setLoading(true);
    try {
      const order = sortOrder === 'desc' ? 'created_at.desc' : 'created_at.asc';
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passports?select=*&order=${order}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      
      // Only include passports with images
      const withImages = data.filter(p => p.image_url);
      setPassports(withImages);
      
      // Extract unique cities
      const uniqueCities = [...new Set(withImages.map(p => p.city))].sort();
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error fetching passports:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...passports];

    // Search by code
    if (searchCode) {
      filtered = filtered.filter(p => 
        p.code.toLowerCase().includes(searchCode.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(p => p.city === selectedCity);
    }

    setFilteredPassports(filtered);
  };

  const clearFilters = () => {
    setSearchCode('');
    setSelectedCity('all');
  };

  const hasActiveFilters = searchCode || selectedCity !== 'all';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-light mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 text-transparent bg-clip-text">
                ColorOut™ Gallery
              </span>
            </h1>
            <p className="text-gray-400 text-lg">
              {passports.length} authenticated ColorOut™ tattoos from around the world
            </p>
          </div>

          {/* Filters */}
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by code..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors uppercase"
                />
              </div>

              {/* City Filter */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="all">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="desc">Most Recent First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Active Filters & Clear */}
            {hasActiveFilters && (
              <div className="mt-4 flex items-center justify-between bg-purple-900/20 border border-purple-800/50 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-purple-300">
                  <Filter className="w-4 h-4" />
                  <span>
                    {searchCode && `Code: "${searchCode}"`}
                    {searchCode && selectedCity !== 'all' && ' • '}
                    {selectedCity !== 'all' && `City: ${selectedCity}`}
                  </span>
                </div>
                <button
                  onClick={clearFilters}
                  className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 text-sm"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading gallery...</p>
          </div>
        ) : filteredPassports.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-light mb-2">No passports found</h3>
            <p className="text-gray-400 mb-6">
              {hasActiveFilters 
                ? "Try adjusting your filters or search term"
                : "No authenticated passports with photos yet"
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-6 py-3 rounded-lg font-medium transition-all"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="mb-6 text-center text-gray-500 text-sm">
              Showing {filteredPassports.length} of {passports.length} passports
            </div>

            {/* Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPassports.map((passport) => (
                <Link
                  key={passport.id}
                  href={`/badge?code=${passport.code}`}
                  className="group relative aspect-square bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl overflow-hidden hover:border-purple-700 transition-all duration-300 cursor-pointer"
                >
                  {/* Image */}
                  <img 
                    src={passport.image_url} 
                    alt={`ColorOut™ ${passport.code}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Info overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="space-y-2">
                      <div className="text-sm font-mono text-white font-semibold bg-gradient-to-r from-pink-400 to-cyan-400 text-transparent bg-clip-text">
                        {passport.code}
                      </div>
                      <div className="flex items-center gap-2 text-gray-200">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{passport.city}</span>
                      </div>
                      {passport.date && (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">{passport.date}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Passport code badge (always visible) */}
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full border border-purple-500/50 z-10">
                    <span className="text-xs font-mono text-purple-300">{passport.code.split('-')[2]}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Back to Home */}
      <div className="border-t border-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
