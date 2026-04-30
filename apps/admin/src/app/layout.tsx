import type { ReactNode } from 'react';
import { AdminNavClient } from './admin-nav-client';

export const metadata = {
  title: 'Alemhub Admin',
  description: 'Alemhub admin control center'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; }
          @media (max-width: 860px) {
            .admin-main { padding-top: 72px !important; }
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: '"Inter", "Segoe UI", Helvetica, Arial, sans-serif',
          background: '#f1f5f9',
          color: '#1e293b',
          minWidth: 320,
          minHeight: '100vh',
          display: 'flex'
        }}
      >
        <AdminNavClient />
        <main
          className="admin-main"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: '100vh',
            overflowX: 'hidden',
            background: '#f1f5f9'
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
