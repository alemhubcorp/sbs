import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouteShell } from './route-shell';
import { getPublicLegalDocument } from './platform-public-settings';

export async function LegalPage({ slug }: { slug: string }) {
  const document = await getPublicLegalDocument(slug);

  if (!document) {
    notFound();
  }

  return (
    <RouteShell
      eyebrow="Legal"
      title={document.title}
      description={document.summary}
      primary={{ label: 'Open Marketplace', href: '/products' }}
      secondary={{ label: 'Help Center', href: '/help-center' }}
    >
      <article
        style={{
          padding: 24,
          borderRadius: 28,
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 20px 48px rgba(15,23,42,0.08)',
          display: 'grid',
          gap: 18
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'grid', gap: 4 }}>
            <strong style={{ fontSize: 20, color: '#0f172a' }}>{document.title}</strong>
            <span style={{ color: '#64748b' }}>Version {document.version}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/returns">Returns</Link>
            <Link href="/support-policy">Support Policy</Link>
            <Link href="/seller-policy">Seller Policy</Link>
          </div>
        </div>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.8,
            color: '#1e293b'
          }}
        >
          {document.content}
        </div>
      </article>
    </RouteShell>
  );
}
