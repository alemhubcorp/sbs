import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Alemhub - Global B2B2C Trade Platform',
  description: 'Global B2B2C trade platform with escrow-protected transactions.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
