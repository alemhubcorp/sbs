import Link from 'next/link';
import { getMarketplaceViewer } from '../../lib/marketplace-viewer';
import { RouteShell } from '../route-shell';
import { RoleCabinetPage } from '../role-cabinet';
import { ComplianceWorkspaceClient } from '../compliance-workspace-client';

const steps = [
  {
    tag: 'Buyer',
    title: 'Complete company basics',
    body: 'Add company name, addresses, and your preferred payment rail before placing the first order.',
    href: '/dashboard'
  },
  {
    tag: 'Supplier',
    title: 'Set up receiving details',
    body: 'Confirm bank details, fulfillment settings, and shipment preferences so quotes can become deals faster.',
    href: '/admin/api-connections/banks'
  },
  {
    tag: 'Logistics',
    title: 'Prepare logistics routing',
    body: 'Confirm logistics company details before accepting shipment assignments.',
    href: '/logistics'
  },
  {
    tag: 'Customs',
    title: 'Prepare customs clearance',
    body: 'Confirm customs broker details before handling documents and clearance cases.',
    href: '/customs'
  },
  {
    tag: 'Admin',
    title: 'Configure the control plane',
    body: 'Set provider keys, routing, invoice data, compliance text, and email settings before the pilot.',
    href: '/admin/api-connections'
  }
];

export default async function OnboardingPage() {
  const viewer = await getMarketplaceViewer();

  if (viewer.role !== 'guest' && viewer.role !== 'admin') {
    return <RoleCabinetPage viewer={viewer} overview={<ComplianceWorkspaceClient role={viewer.role} />} />;
  }

  if (viewer.role === 'admin') {
    return <RoleCabinetPage viewer={viewer} overview={<div style={{ color: '#6b7280' }}>Open the admin compliance board from the Admin cabinet.</div>} />;
  }

  return (
    <RouteShell
      eyebrow="Onboarding"
      title="Start with a clean setup."
      description="Complete the minimum profile, payment, and compliance inputs before moving into active trading."
      primary={{ label: 'Dashboard', href: '/dashboard' }}
      secondary={{ label: 'Products', href: '/products' }}
      cards={steps.map((step) => ({
        tag: step.tag,
        title: step.title,
        body: step.body,
        href: step.href,
        foot: 'Open step →'
      }))}
    >
      <section style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 800, color: '#0d1f3c' }}>Recommended first actions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Link href="/register" style={{ borderRadius: 10, padding: '10px 14px', background: '#0d1f3c', color: '#fff', fontWeight: 700 }}>
              Register
            </Link>
            <Link href="/signin" style={{ borderRadius: 10, padding: '10px 14px', background: '#eef2ff', color: '#1e3a8a', fontWeight: 700 }}>
              Sign In
            </Link>
            <Link href="/admin/api-connections" style={{ borderRadius: 10, padding: '10px 14px', background: '#eef2ff', color: '#1e3a8a', fontWeight: 700 }}>
              Configure payments
            </Link>
          </div>
        </div>
        <div style={{ color: '#6b7280', lineHeight: 1.7 }}>
          The marketplace works best when buyer, supplier, and admin paths are configured before the first RFQ or order.
        </div>
      </section>
    </RouteShell>
  );
}
