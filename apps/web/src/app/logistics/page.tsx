import Link from 'next/link';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RouteShell } from '../route-shell';

export default async function LogisticsPage() {
  const viewer = await getMarketplaceViewer();
  const isLogisticsOperator = viewer.roles.includes('logistics_company');

  return (
    <RouteShell
      eyebrow="Logistics"
      title={isLogisticsOperator ? 'Operations stay on one live logistics route.' : 'Rail, sea, and road logistics stay on one working route.'}
      description={
        isLogisticsOperator
          ? 'You are signed in with logistics access. This route remains stable on the production domain for shipment oversight, order tracking, and deal-linked delivery work.'
          : 'Use this logistics entry point to reach pricing, shipment tracking, and deal-linked fulfillment paths without leaving the marketplace.'
      }
      primary={{ label: isLogisticsOperator ? 'Track orders' : 'Open Pricing', href: isLogisticsOperator ? '/track-order' : '/pricing' }}
      secondary={{ label: 'Open Deals', href: '/deals' }}
      cards={[
        { tag: 'Route', title: 'Shipping pricing', body: 'Open the pricing path for freight planning, lane coverage, and operational settlement flows.', href: '/pricing', foot: 'See pricing →' },
        { tag: 'Control', title: 'Track fulfillment', body: 'Track order movement, shipment progress, milestone confirmation, and operational handoff.', href: '/track-order', foot: 'Track an order →' },
        { tag: 'Escrow', title: 'Protected release', body: 'Keep logistics milestones tied to the same deal and escrow lifecycle without breaking payment logic.', href: '/how-it-works', foot: 'See deal flow →' }
      ]}
    >
      <section
        style={{
          display: 'grid',
          gap: 20,
          padding: 28,
          borderRadius: 28,
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(8, 47, 73, 0.9))',
          color: '#f8fafc',
          border: '1px solid rgba(125, 211, 252, 0.18)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)'
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7dd3fc' }}>Logistics Control</div>
          <div style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', fontWeight: 900, lineHeight: 1.05 }}>
            Shipment control stays on the live production domain.
          </div>
          <div style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
            The logistics route is production-safe, HTTPS-only, and connected to the same marketplace navigation used by requests, orders, deals, and tracking.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            ['Route health', 'Live'],
            ['Scope', 'Pricing + tracking'],
            ['Settlement', 'Escrow-safe']
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                padding: '14px 16px',
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(148, 163, 184, 0.16)'
              }}
            >
              <div style={{ color: '#7dd3fc', fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          {[
            ['Assigned lanes', 'Use this page as the stable entry into shipment pricing and freight workflows.'],
            ['Escrow-safe flow', 'Delivery actions stay visually connected to deal state without changing payment release logic.'],
            ['Operator handoff', 'Tracking, pricing, and order follow-up remain reachable from one route.']
          ].map(([title, body]) => (
            <article
              key={title}
              style={{
                padding: 16,
                borderRadius: 18,
                border: '1px solid rgba(125, 211, 252, 0.22)',
                background: 'rgba(15, 23, 42, 0.35)'
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
              <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>{body}</div>
            </article>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link
            href="/track-order"
            style={{ borderRadius: 999, padding: '12px 16px', background: '#f8fafc', color: '#082f49', fontWeight: 800, textDecoration: 'none' }}
          >
            Track orders
          </Link>
          <Link
            href="/deals"
            style={{ borderRadius: 999, padding: '12px 16px', background: 'rgba(148, 163, 184, 0.16)', color: '#f8fafc', fontWeight: 700, textDecoration: 'none' }}
          >
            Open deals
          </Link>
        </div>
      </section>
    </RouteShell>
  );
}
