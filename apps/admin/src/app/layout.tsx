import type { ReactNode } from 'react';

export const metadata = {
  title: 'RuFlo Admin',
  description: 'RuFlo admin control center'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, background: '#111827', color: '#f9fafb' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
          <aside style={{ padding: 24, background: '#0f172a' }}>
            <h2>RuFlo Admin</h2>
            <nav>
              <p>Dashboard</p>
              <p>Approvals</p>
              <p>Operations</p>
              <p>Modules</p>
            </nav>
          </aside>
          <main style={{ padding: 24 }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
