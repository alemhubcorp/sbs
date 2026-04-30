'use client';

import { useState } from 'react';
import Link from 'next/link';

const navItems = [
  { label: 'Command Deck', description: 'Executive overview', href: '/', icon: '⌘' },
  { label: 'Users', description: 'Accounts and roles', href: '/users', icon: '👥' },
  { label: 'Partners', description: 'Directory and health', href: '/partners', icon: '🤝' },
  { label: 'Payments', description: 'Transactions and escrow', href: '/payments', icon: '💳' },
  { label: 'SMTP', description: 'Notification infrastructure', href: '/settings/smtp', icon: '📧' },
  { label: 'Platform Settings', description: 'Fees, features, and config', href: '/settings/platform', icon: '⚙️' },
  { label: 'Legal Documents', description: 'Terms, privacy, policies', href: '/settings/legal', icon: '📄' }
];

export function AdminNavClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{`
        .admin-sidebar {
          flex: 0 0 280px;
          width: 280px;
          padding: 28px 24px;
          background: linear-gradient(180deg, rgba(7,12,24,0.98) 0%, rgba(15,23,42,0.97) 40%, rgba(22,38,58,0.94) 100%);
          color: #e5eef8;
          display: flex;
          flex-direction: column;
          gap: 24px;
          border-right: 1px solid rgba(148,163,184,0.14);
          position: relative;
          overflow-y: auto;
        }

        .admin-topbar {
          display: none;
        }

        .admin-overlay {
          display: none;
        }

        @media (max-width: 860px) {
          .admin-sidebar {
            display: none;
          }
          .admin-topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px;
            background: rgba(7,12,24,0.98);
            border-bottom: 1px solid rgba(148,163,184,0.14);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 300;
          }
          .admin-overlay {
            display: block;
          }
        }

        .admin-sidebar-drawer {
          position: fixed;
          top: 0;
          left: 0;
          width: 300px;
          max-width: 90vw;
          height: 100vh;
          background: linear-gradient(180deg, rgba(7,12,24,0.99) 0%, rgba(15,23,42,0.99) 100%);
          color: #e5eef8;
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 24px 20px;
          overflow-y: auto;
          transform: translateX(-110%);
          transition: transform 280ms cubic-bezier(0.32, 0, 0.15, 1);
          box-shadow: 8px 0 40px rgba(0,0,0,0.4);
        }

        .admin-sidebar-drawer.open {
          transform: translateX(0);
        }

        .admin-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          z-index: 150;
          opacity: 0;
          pointer-events: none;
          transition: opacity 280ms ease;
          backdrop-filter: blur(3px);
        }

        .admin-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .hamburger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 8px;
          border-radius: 10px;
          border: 1px solid rgba(148,163,184,0.2);
          background: rgba(255,255,255,0.06);
          transition: background 150ms ease;
        }

        .hamburger:hover {
          background: rgba(255,255,255,0.12);
        }

        .hamburger span {
          width: 22px;
          height: 2px;
          background: #e5eef8;
          border-radius: 2px;
          transition: all 200ms ease;
        }

        .hamburger.open span:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .hamburger.open span:nth-child(2) {
          opacity: 0;
          transform: scaleX(0);
        }
        .hamburger.open span:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        .nav-item {
          display: grid;
          grid-template-columns: 40px 1fr;
          gap: 12px;
          align-items: center;
          padding: 13px 14px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(148,163,184,0.1);
          text-decoration: none;
          color: #e5eef8;
          transition: background 150ms ease, border-color 150ms ease;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(52,211,153,0.25);
        }

        .nav-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 16px;
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.15);
          flex-shrink: 0;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 12px rgba(52,211,153,0.8);
          flex-shrink: 0;
        }

        .posture-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .posture-cell {
          padding: 11px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(148,163,184,0.1);
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="admin-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div className="admin-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="status-dot" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#e5eef8', letterSpacing: '-0.02em' }}>Alemhub Admin</span>
        </div>
        <button
          className={`hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile backdrop */}
      <div className={`admin-backdrop admin-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      {/* Mobile drawer */}
      <div className={`admin-sidebar-drawer admin-overlay${open ? ' open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="status-dot" />
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Alemhub Admin</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, color: '#e5eef8', padding: '6px 10px', cursor: 'pointer', fontSize: 16 }}
          >
            ✕
          </button>
        </div>
        <SidebarContent onNavClick={() => setOpen(false)} />
      </div>
    </>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Brand block — only in desktop sidebar */}
      <div style={{ display: 'grid', gap: 12 }} className="sidebar-brand-block">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 999, background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.18)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', width: 'fit-content' }}>
          <span className="status-dot" />
          Stable Control Plane
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1, letterSpacing: '-0.05em' }}>Alemhub Admin</h1>
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            Premium operating console for escrow-sensitive marketplace oversight.
          </p>
        </div>
      </div>

      {/* Ops posture */}
      <div style={{ padding: 16, borderRadius: 20, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(148,163,184,0.12)' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b', marginBottom: 12 }}>Ops posture</div>
        <div className="posture-grid">
          {[
            { label: 'Escrow', value: 'Protected', ok: true },
            { label: 'Routing', value: 'Stable', ok: true },
            { label: 'Auth', value: 'Guarded', ok: true },
            { label: 'Mode', value: 'Live', ok: true }
          ].map((item) => (
            <div key={item.label} className="posture-cell">
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>{item.label}</div>
              <div style={{ marginTop: 5, fontSize: 14, fontWeight: 600, color: item.ok ? '#34d399' : '#f87171' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} className="nav-item" onClick={onNavClick}>
            <div className="nav-icon">{item.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.description}</div>
            </div>
          </Link>
        ))}
      </nav>

      {/* Priority block */}
      <div style={{ marginTop: 'auto', padding: 16, borderRadius: 20, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)' }}>
        <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Priority</div>
        <p style={{ margin: '8px 0 12px', fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>
          Protect deal completion, validate roles, and keep escrow workflows production-safe.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Escrow integrity', 'Role validation', 'Continuity'].map((tag) => (
            <span key={tag} style={{ padding: '4px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.12)', fontSize: 11, color: '#94a3b8' }}>{tag}</span>
          ))}
        </div>
      </div>
    </>
  );
}
