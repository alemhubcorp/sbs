import Link from 'next/link';
import { getMarketplaceViewer, getRoleLabel } from '../../lib/marketplace-viewer';

const roleDestinations = {
  admin: '/dashboard',
  buyer: '/onboarding',
  supplier: '/onboarding',
  logistics: '/logistics',
  customs: '/customs'
} as const;

export default async function CompliancePage() {
  const viewer = await getMarketplaceViewer();
  const recommendedHref = viewer.role === 'guest' ? '/signin?returnTo=/compliance' : roleDestinations[viewer.role];
  const signedInLabel =
    viewer.role === 'guest'
      ? 'Public visitor'
      : `${viewer.email ?? viewer.username ?? 'unknown user'} (${getRoleLabel(viewer.role)})`;

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '48px 20px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2563eb' }}>
            Compliance
          </div>
          <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>Compliance entry route is active.</h1>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.7 }}>
            Viewing as <strong>{signedInLabel}</strong>. This page is public so users can read compliance guidance before authentication, while
            consent and approval checks still apply at registration, checkout, and deal funding.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link
            href={recommendedHref}
            style={{ borderRadius: 12, padding: '12px 16px', background: '#0f172a', color: '#fff', fontWeight: 700, textDecoration: 'none' }}
          >
            {viewer.role === 'guest' ? 'Sign in for compliance actions' : 'Open recommended workspace'}
          </Link>
          {viewer.role !== 'guest' ? (
            <>
              <Link
                href="/dashboard"
                style={{ borderRadius: 12, padding: '12px 16px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}
              >
                Dashboard
              </Link>
              <Link
                href="/onboarding"
                style={{ borderRadius: 12, padding: '12px 16px', background: '#e2e8f0', color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}
              >
                Onboarding
              </Link>
            </>
          ) : null}
        </div>

        <section
          style={{
            borderRadius: 20,
            background: '#fff',
            padding: 24,
            border: '1px solid #dbe3ef',
            boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
            display: 'grid',
            gap: 14
          }}
        >
          <div style={{ fontWeight: 800 }}>Route behavior</div>
          <div style={{ color: '#475569', lineHeight: 1.7 }}>
            The public admin compliance path now resolves through this canonical route instead of returning a 404 from the admin app.
          </div>
          <div style={{ color: '#475569', lineHeight: 1.7 }}>
            Recommended next step for your role: <strong>{recommendedHref}</strong>
          </div>
        </section>
      </div>
    </main>
  );
}
