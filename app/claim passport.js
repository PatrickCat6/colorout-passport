'use client';

import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';

export default function ClaimPassportForm({ onClose }) {
  const [formData, setFormData] = useState({
    holder_name: '',
    email: '',
    tattoo_date: '',
    city: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            holder_name: formData.holder_name,
            email: formData.email,
            tattoo_date: formData.tattoo_date,
            city: formData.city,
            status: 'pending'
          })
        }
      );

      if (response.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setStatus('error');
      setErrorMessage('There was an error submitting your request. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            
            <h3 className="text-2xl font-light mb-4">Request Submitted!</h3>
            
            <p className="text-gray-400 mb-6">
              Your ColorOut™ Passport request has been received. Patrick will review your submission and you'll receive an email with your unique passport code once approved.
            </p>

            <button
              onClick={onClose}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-6 py-3 rounded-lg font-medium transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 max-w-lg w-full relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-3xl font-light mb-2">Claim Your Passport</h3>
        <p className="text-gray-400 mb-8">
          Request your official ColorOut™ Certificate of Authenticity
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              name="holder_name"
              value={formData.holder_name}
              onChange={handleChange}
              required
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Tattoo Date *
            </label>
            <input
              type="text"
              name="tattoo_date"
              value={formData.tattoo_date}
              onChange={handleChange}
              required
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="e.g., March 2024"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              City *
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Where did you get your ColorOut™?"
            />
          </div>

          {status === 'error' && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 px-6 py-4 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Your request will be reviewed by Patrick Cat. You'll receive an email with your unique ColorOut™ passport code once approved.
          </p>
        </form>
      </div>
    </div>
  );
}
