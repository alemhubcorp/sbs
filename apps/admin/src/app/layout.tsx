import type { ReactNode } from 'react';
import { AdminNavClient } from './admin-nav-client';

export const metadata = {
  title: 'Alemhub Admin',
  description: 'Alemhub admin control center'
};

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
        <style>{`
          @media (max-width: 860px) {
            .admin-outer-padding {
              padding: 0 !important;
            }
            .admin-card {
              border-radius: 0 !important;
              border: none !important;
              box-shadow: none !important;
              min-height: 100svh !important;
              background: #f0f4ee !important;
              backdrop-filter: none !important;
            }
            .admin-main-content {
              padding-top: 72px !important;
            }
          }
        `}</style>

        <div
          className="admin-outer-padding"
          style={{
            minHeight: '100vh',
            padding: '20px clamp(16px, 2.6vw, 32px)',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="admin-card"
            style={{
              display: 'flex',
              minHeight: 'calc(100vh - 40px)',
              borderRadius: 36,
              overflow: 'hidden',
              background:
                'linear-gradient(180deg, rgba(255, 255, 255, 0.84) 0%, rgba(248, 250, 247, 0.78) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 28px 90px rgba(15, 23, 42, 0.12)',
              backdropFilter: 'blur(24px)'
            }}
          >
            <AdminNavClient />

            <main
              className="admin-main-content"
              style={{
                flex: '999 1 0px',
                minWidth: 0,
                padding: '32px clamp(20px, 3vw, 36px)',
                overflowX: 'hidden'
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
