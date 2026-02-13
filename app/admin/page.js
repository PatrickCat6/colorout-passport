'use client';

import { useState, useEffect } from 'react';
import { Shield, LogOut, Check, X, Clock, RefreshCw } from 'lucide-react';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';
const ADMIN_PASSWORD = 'colorout2025';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    // Check if already authenticated in session
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchRequests();
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setLoginError('');
      fetchRequests();
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    setPassword('');
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests?status=eq.pending&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNextCode = async () => {
    try {
      // Get the latest passport to determine next number
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passports?select=code&order=code.desc&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lastCode = data[0].code;
        const match = lastCode.match(/(\d+)$/);
        if (match) {
          const nextNum = parseInt(match[1]) + 1;
          const year = new Date().getFullYear();
          return `CO-${year}-${nextNum.toString().padStart(4, '0')}`;
        }
      }
      
      // Fallback if no passports exist
      return `CO-${new Date().getFullYear()}-0071`;
    } catch (error) {
      console.error('Error generating code:', error);
      return `CO-${new Date().getFullYear()}-0071`;
    }
  };

  const approveRequest = async (request) => {
    setProcessingId(request.id);
    try {
      const newCode = await generateNextCode();
      
      // 1. Create new passport
      const createResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/passports`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            code: newCode,
            holder_name: request.holder_name,
            date: request.tattoo_date,
            city: request.city,
            image_url: null
          })
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create passport');
      }

      // 2. Update request status
      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests?id=eq.${request.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_passport_code: newCode
          })
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update request');
      }

      // Refresh the list
      await fetchRequests();
      
      alert(`✅ Approved! Code: ${newCode}\n\nNext steps:\n1. Upload photo to Storage\n2. Update passport with image_url\n3. Send email to: ${request.email}`);
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (request) => {
    if (!confirm(`Reject request from ${request.holder_name}?`)) return;
    
    setProcessingId(request.id);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests?id=eq.${request.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status: 'rejected'
          })
        }
      );

      if (response.ok) {
        await fetchRequests();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Shield className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <h1 className="text-3xl font-light mb-2 text-white">Admin Panel</h1>
            <p className="text-gray-400">ColorOut™ Passport Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
                <p className="text-red-400 text-sm">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-6 py-3 rounded-lg font-medium transition-all"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-light mb-2">Admin Panel</h1>
            <p className="text-gray-400">Manage ColorOut™ Passport Requests</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-900/30 hover:bg-red-900/50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <div className="text-3xl font-light text-white">{requests.length}</div>
                <div className="text-sm text-gray-400">Pending Requests</div>
              </div>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-12 text-center">
            <Check className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-2xl font-light mb-2">All caught up!</h3>
            <p className="text-gray-400">No pending passport requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 hover:border-purple-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-light text-white">{request.holder_name}</h3>
                      <span className="bg-yellow-900/30 border border-yellow-800 text-yellow-400 text-xs px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 mb-1">Email</div>
                        <div className="text-gray-300">{request.email}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Tattoo Date</div>
                        <div className="text-gray-300">{request.tattoo_date}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">City</div>
                        <div className="text-gray-300">{request.city}</div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 mt-3">
                      Submitted: {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => approveRequest(request)}
                      disabled={processingId === request.id}
                      className="bg-green-900/30 hover:bg-green-900/50 border border-green-800 text-green-400 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {processingId === request.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => rejectRequest(request)}
                      disabled={processingId === request.id}
                      className="bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
