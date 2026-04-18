import type { ReactNode } from 'react';

export const metadata = {
  title: 'Safe-Contract - Global B2B2C Trade Platform',
  description: 'Global B2B2C trade platform with escrow-protected transactions.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff', color: '#111' }}>{children}</body>
    </html>
  );
}
