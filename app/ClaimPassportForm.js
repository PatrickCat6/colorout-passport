'use client';

import { useState } from 'react';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';

export default function ClaimPassportForm({ onClose }) {
  const [formData, setFormData] = useState({
    holder_name: '',
    email: '',
    tattoo_date: '',
    city: '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/passport_requests`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          holder_name: formData.holder_name,
          email: formData.email,
          tattoo_date: formData.tattoo_date,
          city: formData.city,
          status: 'pending',
        }),
      });
      if (response.ok) setStatus('success');
      else throw new Error('Failed to submit request');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage('There was an error submitting your request. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Close on Escape
  if (typeof window !== 'undefined') {
    window.onkeydown = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
  }

  return (
    <div className="claim-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="claim-card" onClick={(e) => e.stopPropagation()}>
        <button className="claim-close" onClick={onClose} aria-label="Close">✕</button>

        {status === 'success' ? (
          <div className="claim-success">
            <div className="success-eyebrow">&#10003; Request Received</div>
            <h2 className="claim-title">Welcome to<br />The Archive</h2>
            <p className="claim-body">
              Your ColorOut&#8482; Passport request has been received. Patrick will review your submission and you&apos;ll receive an email with your unique passport code once approved.
            </p>
            <button onClick={onClose} className="claim-submit">Close</button>
          </div>
        ) : (
          <>
            <div className="claim-eyebrow">&middot; Certificate Request</div>
            <h2 className="claim-title">Claim Your<br />Passport</h2>
            <p className="claim-sub">
              Request your official ColorOut&#8482; Certificate of Authenticity
            </p>

            <form onSubmit={handleSubmit} className="claim-form">
              <div className="field">
                <label>Your Name <span className="req">*</span></label>
                <input
                  type="text"
                  name="holder_name"
                  value={formData.holder_name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="field">
                <label>Email Address <span className="req">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Tattoo Date <span className="req">*</span></label>
                  <input
                    type="text"
                    name="tattoo_date"
                    value={formData.tattoo_date}
                    onChange={handleChange}
                    required
                    placeholder="e.g. March 2024"
                  />
                </div>
                <div className="field">
                  <label>City <span className="req">*</span></label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    placeholder="NYC, SLC, Portland..."
                  />
                </div>
              </div>

              {status === 'error' && <div className="claim-error">{errorMessage}</div>}

              <button type="submit" disabled={status === 'loading'} className="claim-submit">
                {status === 'loading' ? 'Submitting…' : 'Submit Request →'}
              </button>

              <p className="claim-foot">
                Your request will be reviewed by Patrick Cat. You&apos;ll receive an email with your unique ColorOut&#8482; passport code once approved.
              </p>
            </form>
          </>
        )}
      </div>

      <style jsx>{`
        .claim-modal {
          position: fixed;
          inset: 0;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(24px);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          overflow-y: auto;
        }
        .claim-card {
          position: relative;
          max-width: 560px;
          width: 100%;
          background: var(--black);
          border: 1px solid rgba(10, 10, 10, 0.1);
          box-shadow: 0 30px 80px rgba(10, 10, 10, 0.18);
          padding: 56px 44px;
          overflow: hidden;
        }
        .claim-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--gradient-spectrum);
          background-size: 300% 100%;
          animation: spectrumFlow 4s linear infinite;
        }
        .claim-close {
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
          color: var(--white);
          transition: all 0.25s;
        }
        .claim-close:hover {
          border-color: var(--magenta);
          color: var(--magenta);
        }

        .claim-eyebrow,
        .success-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--magenta);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .success-eyebrow { color: #00a85a; }
        .claim-eyebrow::before,
        .success-eyebrow::before {
          content: '';
          width: 30px;
          height: 1px;
          background: currentColor;
        }

        .claim-title {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: clamp(40px, 6vw, 56px);
          line-height: 0.9;
          letter-spacing: -2.5px;
          text-transform: uppercase;
          color: var(--white);
          margin-bottom: 14px;
        }
        .claim-sub,
        .claim-body {
          font-family: var(--font-body);
          font-size: 13px;
          line-height: 1.7;
          color: rgba(10, 10, 10, 0.55);
          margin-bottom: 32px;
          max-width: 420px;
        }
        .claim-sub {
          letter-spacing: 1px;
          text-transform: uppercase;
          font-size: 12px;
          letter-spacing: 2px;
        }

        .claim-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field label {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.45);
          font-weight: 600;
        }
        .field .req {
          color: var(--magenta);
        }
        .field input {
          padding: 14px 16px;
          background: rgba(10, 10, 10, 0.04);
          border: 1px solid rgba(10, 10, 10, 0.1);
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--white);
          letter-spacing: 0.5px;
          outline: none;
          transition: all 0.25s;
        }
        .field input::placeholder {
          color: rgba(10, 10, 10, 0.3);
        }
        .field input:focus {
          border-color: var(--cyan);
          background: rgba(0, 229, 255, 0.03);
        }

        .claim-error {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--magenta);
          padding: 12px 16px;
          background: rgba(255, 45, 123, 0.06);
          border: 1px solid rgba(255, 45, 123, 0.2);
        }

        .claim-submit {
          margin-top: 12px;
          padding: 16px 24px;
          background: var(--gradient-spectrum);
          background-size: 200% 200%;
          animation: spectrumFlow 4s linear infinite;
          border: none;
          color: var(--black);
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
        }
        .claim-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.25);
        }
        .claim-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .claim-foot {
          font-family: var(--font-body);
          font-size: 11px;
          line-height: 1.6;
          color: rgba(10, 10, 10, 0.4);
          text-align: center;
          letter-spacing: 0.3px;
          margin-top: 4px;
        }

        .claim-success {
          text-align: left;
        }
        .claim-success .claim-body {
          margin-bottom: 28px;
        }

        @media (max-width: 600px) {
          .claim-modal { padding: 0; }
          .claim-card {
            padding: 80px 24px 32px;
            min-height: 100vh;
            max-width: none;
          }
          .field-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
