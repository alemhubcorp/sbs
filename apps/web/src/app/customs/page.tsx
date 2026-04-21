import Link from 'next/link';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RouteShell } from '../route-shell';

export default async function CustomsPage() {
  const viewer = await getMarketplaceViewer();
  const isCustomsOperator = viewer.roles.includes('customs_broker') || (viewer.role as string) === 'customs';

  return (
    <RouteShell
      eyebrow="Customs"
      title={isCustomsOperator ? 'Clearance handling stays live on one route.' : 'Customs case handling stays visible in one route.'}
      description={
        isCustomsOperator
          ? 'You are signed in with customs access. This route stays stable on the production domain for case review, document readiness, and issue escalation.'
          : 'Use this customs entry point to keep clearance status, documents, and issue flags linked to the same marketplace case.'
      }
      primary={{ label: isCustomsOperator ? 'Open notifications' : 'Open Onboarding', href: isCustomsOperator ? '/notifications' : '/onboarding' }}
      secondary={{ label: 'Open Notifications', href: '/notifications' }}
      cards={[
        { tag: 'Case', title: 'Clearance updates', body: 'Track customs cases, document requests, escalation flags, and readiness from one route.', href: '/notifications', foot: 'Open notifications →' },
        { tag: 'Docs', title: 'Documents', body: 'Keep customs documents and tracking context close to the operational timeline.', href: '/track-order', foot: 'Open tracking →' },
        { tag: 'Control', title: 'Broker cabinet', body: 'Customs brokers can use their cabinet after sign-in without leaving the live marketplace.', href: '/signin?returnTo=/customs', foot: 'Sign in →' }
      ]}
    >
      <section
        style={{
          display: 'grid',
          gap: 20,
          padding: 28,
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(69, 10, 10, 0.94), rgba(120, 53, 15, 0.92))',
          color: '#fff7ed',
          border: '1px solid rgba(253, 186, 116, 0.18)',
          boxShadow: '0 24px 60px rgba(120, 53, 15, 0.16)'
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#fdba74' }}>Customs Control</div>
          <div style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, lineHeight: 1.05 }}>
            Clearance coordination stays on the live production domain.
          </div>
          <div style={{ color: '#fed7aa', lineHeight: 1.7 }}>
            The customs route is now a stable HTTPS entry point for case tracking, document readiness, and issue escalation without falling back to missing
            or local-only paths.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            ['Route health', 'Live'],
            ['Focus', 'Case control'],
            ['Documents', 'In flow']
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: '14px 16px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(253, 186, 116, 0.16)'
              }}
            >
              <div style={{ color: '#fdba74', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            ['Clearance path', 'Use one domain entry for document follow-up, issue escalation, and broker handoff.'],
            ['Case visibility', 'The public customs route stays available while deeper customs tooling continues to evolve.'],
            ['Marketplace continuity', 'Notifications, tracking, and onboarding remain connected through the same navigation layer.']
          ].map(([title, body]) => (
            <article
              key={title}
              style={{
                padding: 16,
                borderRadius: 18,
                border: '1px solid rgba(253, 186, 116, 0.24)',
                background: 'rgba(127, 29, 29, 0.24)'
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
              <div style={{ color: '#ffedd5', lineHeight: 1.6 }}>{body}</div>
            </article>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link
            href="/notifications"
            style={{ borderRadius: 999, padding: '12px 16px', background: '#fff7ed', color: '#7c2d12', fontWeight: 800, textDecoration: 'none' }}
          >
            Open notifications
          </Link>
          <Link
            href="/track-order"
            style={{ borderRadius: 999, padding: '12px 16px', background: 'rgba(255, 237, 213, 0.12)', color: '#fff7ed', fontWeight: 700, textDecoration: 'none' }}
          >
            Track cases
          </Link>
        </div>
      </section>
    </RouteShell>
  );
}
