'use client';

import { useState } from 'react';
import Link from 'next/link';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/', icon: '⌘' }
    ]
  },
  {
    label: 'Management',
    items: [
      { label: 'Users', href: '/users', icon: '👥' },
      { label: 'Partners', href: '/partners', icon: '🤝' },
      { label: 'Payments', href: '/payments', icon: '💳' },
      { label: 'API Connections', href: '/api-connections', icon: '🔌' }
    ]
  },
  {
    label: 'Settings',
    items: [
      { label: 'SMTP', href: '/settings/smtp', icon: '📧' },
      { label: 'Platform', href: '/settings/platform', icon: '⚙️' },
      { label: 'Legal', href: '/settings/legal', icon: '📄' }
    ]
  }
];

const css = `
  .asb { flex: 0 0 220px; width: 220px; background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column; border-right: 1px solid rgba(255,255,255,0.07); overflow-y: auto; }
  .asb-logo { padding: 20px 16px 14px; border-bottom: 1px solid rgba(255,255,255,0.07); }
  .asb-logo-badge { display: flex; align-items: center; gap: 8px; }
  .asb-logo-dot { width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg,#34d399,#059669); display: grid; place-items: center; font-size: 16px; flex-shrink: 0; }
  .asb-logo-name { font-size: 15px; font-weight: 700; letter-spacing: -0.02em; color: #f1f5f9; }
  .asb-logo-sub { font-size: 11px; color: #64748b; }
  .asb-status { margin: 10px 16px 0; padding: 6px 10px; border-radius: 6px; background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #34d399; display: flex; align-items: center; gap: 6px; }
  .asb-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px #34d399; flex-shrink: 0; }
  .asb-nav { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .asb-section-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; padding: 10px 8px 4px; }
  .asb-link { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; text-decoration: none; color: #94a3b8; font-size: 13.5px; font-weight: 500; transition: background 120ms, color 120ms; }
  .asb-link:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
  .asb-link-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
  .asb-site-link { display: flex; align-items: center; gap: 8px; padding: 9px 12px; margin: 0 10px 8px; border-radius: 8px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.18); text-decoration: none; color: #34d399; font-size: 12.5px; font-weight: 600; transition: background 120ms; }
  .asb-site-link:hover { background: rgba(52,211,153,0.15); }
  .asb-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; gap: 10px; }
  .asb-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#334155,#1e293b); display: grid; place-items: center; font-size: 13px; font-weight: 700; color: #94a3b8; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
  .asb-user-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .asb-user-role { font-size: 11px; color: #475569; }

  /* Topbar (mobile only) */
  .atb { display: none; }
  .atb-overlay { display: none; }

  @media (max-width: 860px) {
    .asb { display: none; }
    .atb {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; height: 56px; background: #0f172a;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      position: fixed; top: 0; left: 0; right: 0; z-index: 300;
    }
    .atb-overlay { display: block; }
  }

  .atb-ham { display: flex; flex-direction: column; gap: 4px; cursor: pointer; padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
  .atb-ham span { width: 20px; height: 2px; background: #e2e8f0; border-radius: 2px; transition: all 180ms ease; display: block; }
  .atb-ham.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
  .atb-ham.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .atb-ham.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

  .adr {
    position: fixed; top: 0; left: 0; width: 240px; max-width: 85vw; height: 100vh;
    background: #0f172a; z-index: 400; display: flex; flex-direction: column;
    transform: translateX(-110%); transition: transform 260ms cubic-bezier(0.32,0,0.15,1);
    box-shadow: 8px 0 32px rgba(0,0,0,0.5); overflow-y: auto;
  }
  .adr.open { transform: translateX(0); }

  .abk {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 350;
    opacity: 0; pointer-events: none; transition: opacity 260ms ease; backdrop-filter: blur(2px);
  }
  .abk.open { opacity: 1; pointer-events: auto; }
`;

export function AdminNavClient() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <style>{css}</style>

      {/* Desktop sidebar */}
      <aside className="asb">
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div className="atb">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="asb-logo-dot" style={{ width: 28, height: 28, fontSize: 13 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Alemhub Admin</span>
        </div>
        <button className={`atb-ham${open ? ' open' : ''}`} onClick={() => setOpen(!open)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile backdrop */}
      <div className={`abk atb-overlay${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      {/* Mobile drawer */}
      <div className={`adr atb-overlay${open ? ' open' : ''}`}>
        <SidebarContent onNavClick={() => setOpen(false)} />
      </div>
    </>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      <div className="asb-logo">
        <div className="asb-logo-badge">
          <div className="asb-logo-dot">⚡</div>
          <div>
            <div className="asb-logo-name">Alemhub</div>
            <div className="asb-logo-sub">Admin Panel</div>
          </div>
        </div>
        <div className="asb-status">
          <span className="asb-status-dot" />
          Stable Control Plane
        </div>
      </div>

      <nav className="asb-nav">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="asb-section-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="asb-link"
                {...(onNavClick ? { onClick: onNavClick } : {})}
              >
                <span className="asb-link-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <a href="https://alemhub.sbs" target="_blank" rel="noreferrer" className="asb-site-link">
        🌐 <span>Visit Website</span>
      </a>
      <div className="asb-footer">
        <div className="asb-avatar">A</div>
        <div>
          <div className="asb-user-name">Admin</div>
          <div className="asb-user-role">Platform Operator</div>
        </div>
      </div>
    </>
  );
}
