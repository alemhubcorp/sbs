import type { ReactNode } from 'react';

export const metadata = {
  title: 'RuFlo Admin',
  description: 'RuFlo admin control center'
};

const navItems = [
  { label: 'Command Deck', description: 'Executive overview' },
  { label: 'Approvals', description: 'Role and access control' },
  { label: 'Escrow Ops', description: 'Protected payment actions' },
  { label: 'Supply Flow', description: 'RFQs, contracts, logistics' },
  { label: 'Partners', description: 'Directory and health' },
  { label: 'SMTP', description: 'Notification infrastructure' }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background:
            'radial-gradient(circle at top left, rgba(22, 163, 74, 0.18), transparent 26%), radial-gradient(circle at 85% 12%, rgba(15, 23, 42, 0.12), transparent 24%), linear-gradient(180deg, #f6f8f4 0%, #ebf0e9 52%, #e5ece7 100%)',
          color: '#172033',
          fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
          minWidth: 320
        }}
      >
        <div
          style={{
            minHeight: '100vh',
            padding: '20px clamp(16px, 2.6vw, 32px)',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              minHeight: 'calc(100vh - 40px)',
              borderRadius: 36,
              overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.84) 0%, rgba(248, 250, 247, 0.78) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 28px 90px rgba(15, 23, 42, 0.12)',
              backdropFilter: 'blur(24px)'
            }}
          >
            <aside
              style={{
                flex: '1 1 280px',
                minWidth: 260,
                padding: 30,
                background:
                  'linear-gradient(180deg, rgba(7, 12, 24, 0.98) 0%, rgba(15, 23, 42, 0.97) 40%, rgba(22, 38, 58, 0.94) 100%)',
                color: '#e5eef8',
                display: 'grid',
                alignContent: 'start',
                gap: 30,
                borderRight: '1px solid rgba(148, 163, 184, 0.18)'
              }}
            >
              <div style={{ display: 'grid', gap: 14 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    width: 'fit-content',
                    padding: '9px 13px',
                    borderRadius: 999,
                    background: 'rgba(148, 163, 184, 0.14)',
                    border: '1px solid rgba(148, 163, 184, 0.22)',
                    fontSize: 12,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase'
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#34d399',
                      boxShadow: '0 0 18px rgba(52, 211, 153, 0.8)'
                    }}
                  />
                  Stable Control Plane
                </div>
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 32,
                      lineHeight: 0.95,
                      fontFamily: '"Segoe UI", Helvetica, Arial, sans-serif',
                      letterSpacing: '-0.05em'
                    }}
                  >
                    RuFlo Admin
                  </h1>
                  <p style={{ margin: '10px 0 0', color: '#b8c4d6', lineHeight: 1.6 }}>
                    Premium operating console for escrow-sensitive marketplace oversight.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 14,
                  padding: 20,
                  borderRadius: 24,
                  background:
                    'linear-gradient(180deg, rgba(15, 23, 42, 0.22) 0%, rgba(15, 23, 42, 0.08) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#94a3b8' }}>
                  Ops posture
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12
                  }}
                >
                  {[
                    { label: 'Escrow', value: 'Protected' },
                    { label: 'Routing', value: 'Stable' },
                    { label: 'Auth', value: 'Guarded' },
                    { label: 'Mode', value: 'Live' }
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: '12px 12px 10px',
                        borderRadius: 18,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(148, 163, 184, 0.12)'
                      }}
                    >
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8' }}>
                        {item.label}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#f8fafc'
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <nav style={{ display: 'grid', gap: 12 }}>
                {navItems.map((item, index) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr',
                      gap: 14,
                      alignItems: 'start',
                      padding: '16px 16px 15px',
                      borderRadius: 20,
                      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.18) 100%)',
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(52, 211, 153, 0.12)',
                        color: '#86efac',
                        fontSize: 12,
                        fontWeight: 700,
                        border: '1px solid rgba(52, 211, 153, 0.14)'
                      }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.label}</div>
                      <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{item.description}</div>
                    </div>
                  </div>
                ))}
              </nav>

              <div
                style={{
                  marginTop: 'auto',
                  padding: 20,
                  borderRadius: 24,
                  background: 'linear-gradient(180deg, rgba(226, 232, 240, 0.12) 0%, rgba(148, 163, 184, 0.08) 100%)',
                  border: '1px solid rgba(148, 163, 184, 0.16)'
                }}
              >
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Priority
                </div>
                <p style={{ margin: '8px 0 0', lineHeight: 1.6 }}>
                  Protect deal completion, validate roles, and keep escrow workflows production-safe.
                </p>
                <div
                  style={{
                    marginTop: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  {['Escrow integrity', 'Role validation', 'Operational continuity'].map((item) => (
                    <span
                      key={item}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderRadius: 999,
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(148, 163, 184, 0.14)',
                        fontSize: 12,
                        color: '#cbd5e1'
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <main
              style={{
                flex: '999 1 720px',
                minWidth: 0,
                padding: '32px clamp(20px, 3vw, 36px)',
                overflow: 'auto'
              }}
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
