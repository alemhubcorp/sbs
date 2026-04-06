import type { ReactNode } from 'react';

export const metadata = {
  title: 'RuFlo Web',
  description: 'RuFlo client application'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', margin: 0, background: '#f7f7f2', color: '#1f2937' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>{children}</div>
      </body>
    </html>
  );
}
