'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SUPABASE_URL = 'https://ypwgutlxjdpszlkwzyyu.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwd2d1dGx4amRwc3psa3d6eXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjQ1MjgsImV4cCI6MjA4NjUwMDUyOH0.yV4j8tZ6-eNmLKS7NlxfPtUaQ1-qn33yUaKtln-KMJo';
const ADMIN_PASSWORD = 'colorout2025';

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [totalApproved, setTotalApproved] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('admin_auth') === 'true') {
      setAuthed(true);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests?status=eq.pending&order=created_at.desc`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await r.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchApprovedCount = useCallback(async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/passports?select=*`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'count=exact',
        },
      });
      const c = r.headers.get('content-range');
      if (c) {
        const total = parseInt(c.split('/')[1]);
        if (!isNaN(total)) setTotalApproved(total);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      fetchRequests();
      fetchApprovedCount();
    }
  }, [authed, fetchRequests, fetchApprovedCount]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      sessionStorage.setItem('admin_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Invalid password');
    }
  };

  const handleLogout = () => {
    setAuthed(false);
    sessionStorage.removeItem('admin_auth');
    setPassword('');
  };

  const generateNextCode = async () => {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/passports?select=code&order=created_at.desc&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await r.json();
      if (data && data.length > 0) {
        const parts = data[0].code.split('-');
        if (parts.length === 3) {
          const next = parseInt(parts[2]) + 1;
          return `CO-${new Date().getFullYear()}-${next.toString().padStart(4, '0')}`;
        }
      }
      return `CO-${new Date().getFullYear()}-0001`;
    } catch (e) {
      console.error(e);
      return `CO-${new Date().getFullYear()}-0001`;
    }
  };

  const approveRequest = async (request) => {
    setProcessingId(request.id);
    try {
      const newCode = await generateNextCode();
      const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/passports`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          code: newCode,
          holder_name: request.holder_name,
          date: request.tattoo_date,
          city: request.city,
          image_url: null,
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Failed to create passport: ${JSON.stringify(errorData)}`);
      }

      const updateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/passport_requests?id=eq.${request.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_passport_code: newCode,
          }),
        }
      );

      if (!updateResponse.ok) throw new Error('Failed to update request');

      try {
        const emailResponse = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: request.email,
            holderName: request.holder_name,
            passportCode: newCode,
            walletPassUrl: null,
          }),
        });
        const emailResult = await emailResponse.json();
        if (emailResult.success) {
          alert(`✓ Approved & Email Sent\n\nCode: ${newCode}\nEmail: ${request.email}\n\nNext: upload photo to Storage and update image_url`);
        } else {
          alert(`✓ Passport Created: ${newCode}\n⚠ Email failed. Send manually to: ${request.email}`);
        }
      } catch (emailError) {
        alert(`✓ Passport Created: ${newCode}\n⚠ Email error. Send manually to: ${request.email}`);
      }

      await fetchRequests();
      await fetchApprovedCount();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRequest = async (request) => {
    if (!confirm(`Reject request from ${request.holder_name}?`)) return;
    setProcessingId(request.id);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/passport_requests?id=eq.${request.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (r.ok) await fetchRequests();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  // ───────────────────────── LOGIN ─────────────────────────
  if (!authed) {
    return (
      <>
        <div className="spectrum-bar" />
        <nav>
          <div className="nav-logo" style={{ fontSize: '17px' }}>COLOROUT&#8482;</div>
          <div className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/gallery">Gallery</Link>
          </div>
        </nav>

        <div className="login-wrap">
          <div className="login-card">
            <div className="login-eyebrow">&#9678; Restricted Access</div>
            <h1 className="login-title">Admin<br />Panel</h1>
            <p className="login-sub">ColorOut&#8482; Passport Management</p>

            <form onSubmit={handleLogin} className="login-form">
              <label className="login-label">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="login-input"
              />
              {loginError && <div className="login-error">{loginError}</div>}
              <button type="submit" className="login-btn">Enter</button>
            </form>
          </div>
        </div>

        <style jsx>{`
          .login-wrap {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 100px 24px 60px;
            position: relative;
          }
          .login-wrap::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: linear-gradient(rgba(0, 229, 255, 0.015) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 229, 255, 0.015) 1px, transparent 1px);
            background-size: 60px 60px;
            pointer-events: none;
          }
          .login-card {
            position: relative;
            max-width: 460px;
            width: 100%;
            padding: 56px 44px;
            background: rgba(10, 10, 10, 0.025);
            border: 1px solid rgba(10, 10, 10, 0.08);
            overflow: hidden;
          }
          .login-card::before {
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
          .login-eyebrow {
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
          .login-title {
            font-family: var(--font-body);
            font-weight: 800;
            font-size: clamp(48px, 8vw, 72px);
            line-height: 0.9;
            letter-spacing: -3px;
            text-transform: uppercase;
            color: var(--white);
            margin-bottom: 14px;
          }
          .login-sub {
            font-family: var(--font-body);
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: rgba(10, 10, 10, 0.5);
            margin-bottom: 36px;
          }
          .login-form {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .login-label {
            font-family: var(--font-body);
            font-size: 10px;
            letter-spacing: 2.5px;
            text-transform: uppercase;
            color: rgba(10, 10, 10, 0.4);
            font-weight: 600;
          }
          .login-input {
            padding: 14px 18px;
            background: rgba(10, 10, 10, 0.04);
            border: 1px solid rgba(10, 10, 10, 0.1);
            font-family: var(--font-body);
            font-size: 14px;
            color: var(--white);
            letter-spacing: 2px;
            outline: none;
            transition: all 0.25s;
          }
          .login-input:focus {
            border-color: var(--cyan);
            background: rgba(0, 229, 255, 0.03);
          }
          .login-error {
            font-family: var(--font-body);
            font-size: 11px;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: var(--magenta);
            padding: 10px 14px;
            background: rgba(255, 45, 123, 0.06);
            border: 1px solid rgba(255, 45, 123, 0.2);
          }
          .login-btn {
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
          .login-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 8px 30px rgba(139, 92, 246, 0.25);
          }
        `}</style>
      </>
    );
  }

  // ───────────────────────── DASHBOARD ─────────────────────────
  return (
    <>
      <div className="spectrum-bar" />

      <nav>
        <div className="nav-logo" style={{ fontSize: '17px' }}>COLOROUT&#8482;</div>
        <div className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/gallery">Gallery</Link>
          <span className="nav-admin-tag">◉ Admin</span>
        </div>
        <button className="nav-menu-btn" aria-label="Open menu" onClick={() => setMenuOpen(true)}>MENU</button>
      </nav>

      <div className={`mobile-menu${menuOpen ? ' open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-menu-header">
          <div className="nav-logo">ColorOut&#8482;</div>
          <button className="nav-menu-btn" onClick={() => setMenuOpen(false)}>CLOSE</button>
        </div>
        <div className="mobile-menu-links">
          <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link href="/gallery" onClick={() => setMenuOpen(false)}>Gallery</Link>
        </div>
      </div>

      {/* HEADER */}
      <header className="admin-header">
        <div>
          <div className="admin-eyebrow">&#9678; Internal Dashboard</div>
          <h1 className="admin-title">
            Admin<span className="ar">/ {String(requests.length).padStart(2, '0')}</span>
          </h1>
          <p className="admin-sub">ColorOut&#8482; Passport request management</p>
        </div>
        <div className="admin-actions">
          <button onClick={fetchRequests} disabled={loading} className="action-btn">
            <span className={`refresh-icon${loading ? ' spinning' : ''}`}>↻</span>
            Refresh
          </button>
          <button onClick={handleLogout} className="action-btn logout">
            <span>↗</span>
            Logout
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{String(requests.length).padStart(2, '0')}</div>
          <div className="stat-lbl">Pending<br />Requests</div>
          <div className="stat-bar magenta" />
        </div>
        <div className="stat-card">
          <div className="stat-num">{String(totalApproved).padStart(2, '0')}</div>
          <div className="stat-lbl">Approved<br />Passports</div>
          <div className="stat-bar cyan" />
        </div>
        <div className="stat-card">
          <div className="stat-num">{new Date().getFullYear()}</div>
          <div className="stat-lbl">Current<br />Series</div>
          <div className="stat-bar green" />
        </div>
      </div>

      {/* REQUESTS */}
      <section className="requests-section">
        <div className="section-head">
          <div className="section-eyebrow">&middot; Pending Queue</div>
          <h2 className="section-h2">Awaiting Review</h2>
        </div>

        {loading ? (
          <div className="state">Loading requests…</div>
        ) : requests.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">✓</div>
            <div className="empty-title">All caught up</div>
            <div className="empty-sub">No pending passport requests at the moment.</div>
          </div>
        ) : (
          <div className="requests-list">
            {requests.map((request) => (
              <article key={request.id} className="request-card">
                <div className="request-main">
                  <div className="request-top">
                    <h3 className="request-name">{request.holder_name}</h3>
                    <span className="status-pill">&#9673; Pending</span>
                  </div>

                  <div className="request-grid">
                    <div className="rg-item">
                      <label>Email</label>
                      <span>{request.email}</span>
                    </div>
                    <div className="rg-item">
                      <label>Tattoo Date</label>
                      <span>{request.tattoo_date || '—'}</span>
                    </div>
                    <div className="rg-item">
                      <label>City</label>
                      <span>{request.city || '—'}</span>
                    </div>
                  </div>

                  <div className="request-meta">
                    Submitted {new Date(request.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="request-actions">
                  <button
                    onClick={() => approveRequest(request)}
                    disabled={processingId === request.id}
                    className="btn-approve"
                  >
                    {processingId === request.id ? (
                      <>
                        <span className="refresh-icon spinning">↻</span>
                        Processing
                      </>
                    ) : (
                      <>✓ Approve</>
                    )}
                  </button>
                  <button
                    onClick={() => rejectRequest(request)}
                    disabled={processingId === request.id}
                    className="btn-reject"
                  >
                    ✕ Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <div className="footer-brand">ColorOut&#8482;</div>
        <div className="footer-sub">Preserving Color as Preserving Humanity</div>
        <p className="footer-copy">&copy; 2026 Mixi Art Studio LLC. All rights reserved.</p>
      </footer>

      <style jsx>{`
        .nav-admin-tag {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--magenta);
          background: rgba(255, 45, 123, 0.08);
          border: 1px solid rgba(255, 45, 123, 0.25);
          padding: 4px 10px;
          font-weight: 600;
        }

        .admin-header {
          padding: 140px 40px 40px;
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 40px;
          align-items: end;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
        }
        .admin-eyebrow {
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
        .admin-eyebrow::before {
          content: '';
          width: 30px;
          height: 1px;
          background: var(--magenta);
        }
        .admin-title {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: clamp(60px, 9vw, 140px);
          line-height: 0.85;
          letter-spacing: -4px;
          text-transform: uppercase;
          color: var(--white);
        }
        .admin-title :global(.ar) {
          font-size: 0.28em;
          vertical-align: top;
          opacity: 0.45;
          font-weight: 500;
          letter-spacing: 1px;
          margin-left: 8px;
        }
        .admin-sub {
          font-family: var(--font-body);
          font-size: 13px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.5);
          margin-top: 14px;
        }
        .admin-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .action-btn {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
          padding: 12px 18px;
          background: transparent;
          border: 1px solid rgba(10, 10, 10, 0.15);
          color: var(--white);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .action-btn:hover {
          border-color: var(--cyan);
          color: var(--cyan);
        }
        .action-btn.logout:hover {
          border-color: var(--magenta);
          color: var(--magenta);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .refresh-icon {
          display: inline-block;
          font-size: 14px;
          line-height: 1;
        }
        .refresh-icon.spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .stats-row {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 40px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
        }
        .stat-card {
          position: relative;
          padding: 32px 28px;
          background: rgba(10, 10, 10, 0.025);
          border: 1px solid rgba(10, 10, 10, 0.06);
          display: flex;
          align-items: baseline;
          gap: 20px;
          overflow: hidden;
        }
        .stat-num {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 56px;
          letter-spacing: -2px;
          line-height: 1;
          color: var(--white);
        }
        .stat-lbl {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.45);
          line-height: 1.5;
        }
        .stat-bar {
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
        }
        .stat-bar.magenta { background: var(--magenta); }
        .stat-bar.cyan { background: var(--cyan); }
        .stat-bar.green { background: var(--green); }

        .requests-section {
          max-width: 1400px;
          margin: 0 auto;
          padding: 60px 40px 80px;
        }
        .section-head {
          margin-bottom: 32px;
        }
        .section-eyebrow {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--cyan);
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .section-eyebrow::before {
          content: '';
          width: 30px;
          height: 1px;
          background: var(--cyan);
        }
        .section-h2 {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -1px;
          line-height: 1;
          color: var(--white);
        }

        .state {
          padding: 80px 20px;
          text-align: center;
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.35);
        }
        .empty-card {
          padding: 80px 40px;
          text-align: center;
          background: rgba(10, 10, 10, 0.025);
          border: 1px solid rgba(10, 10, 10, 0.06);
        }
        .empty-icon {
          font-size: 48px;
          color: var(--green);
          margin-bottom: 18px;
        }
        .empty-title {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 28px;
          letter-spacing: -1px;
          color: var(--white);
          margin-bottom: 8px;
        }
        .empty-sub {
          font-family: var(--font-body);
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.4);
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .request-card {
          position: relative;
          padding: 28px 32px;
          background: rgba(10, 10, 10, 0.025);
          border: 1px solid rgba(10, 10, 10, 0.06);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 32px;
          align-items: center;
          transition: all 0.3s;
        }
        .request-card:hover {
          border-color: rgba(0, 229, 255, 0.25);
          background: rgba(0, 229, 255, 0.02);
        }
        .request-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          background: var(--yellow);
        }
        .request-top {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }
        .request-name {
          font-family: var(--font-body);
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.5px;
          color: var(--white);
        }
        .status-pill {
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 600;
          color: #b87b00;
          background: rgba(255, 225, 0, 0.15);
          border: 1px solid rgba(255, 200, 0, 0.4);
          padding: 4px 10px;
        }
        .request-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          padding-top: 18px;
          border-top: 1px solid rgba(10, 10, 10, 0.06);
        }
        .rg-item :global(label) {
          font-family: var(--font-body);
          font-size: 9px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.4);
          display: block;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .rg-item :global(span) {
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--white);
          font-weight: 600;
          word-break: break-word;
        }
        .request-meta {
          margin-top: 14px;
          font-family: var(--font-body);
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.35);
        }
        .request-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 140px;
        }
        .btn-approve,
        .btn-reject {
          font-family: var(--font-body);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 700;
          padding: 12px 18px;
          border: 1px solid;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.25s;
        }
        .btn-approve {
          background: rgba(0, 255, 136, 0.08);
          border-color: rgba(0, 255, 136, 0.4);
          color: #00a85a;
        }
        .btn-approve:hover:not(:disabled) {
          background: var(--green);
          color: var(--black);
          border-color: var(--green);
        }
        .btn-reject {
          background: transparent;
          border-color: rgba(255, 45, 123, 0.35);
          color: var(--magenta);
        }
        .btn-reject:hover:not(:disabled) {
          background: var(--magenta);
          color: var(--black);
          border-color: var(--magenta);
        }
        .btn-approve:disabled,
        .btn-reject:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .admin-header {
            padding: 120px 20px 30px;
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .admin-actions {
            flex-wrap: wrap;
          }
          .stats-row {
            grid-template-columns: 1fr;
            padding: 24px 20px;
          }
          .requests-section {
            padding: 40px 20px 60px;
          }
          .request-card {
            grid-template-columns: 1fr;
            gap: 20px;
            padding: 24px;
          }
          .request-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          .request-actions {
            flex-direction: row;
            min-width: auto;
          }
          .btn-approve,
          .btn-reject {
            flex: 1;
          }
          .nav-admin-tag {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
