import type { ReactNode } from 'react';
import Link from 'next/link';
import { RouteShell } from './route-shell';
import { getRoleLabel, type MarketplaceViewer } from '../lib/marketplace-viewer';
import styles from './core-flow.module.css';

type CabinetCard = {
  tag: string;
  title: string;
  body: string;
  href: string;
  foot: string;
};

function cabinetCopy(viewer: MarketplaceViewer, variant: 'dashboard' | 'admin') {
  if (viewer.role === 'guest') {
    return {
      eyebrow: 'Marketplace access',
      title: 'Sign in to reach your role-aware cabinet.',
      description:
        'Buyers, suppliers, and admins each get their own workspace once authenticated. The public marketplace stays open, but trade actions begin after login.',
      primary: { label: 'Sign In', href: '/signin?returnTo=/dashboard' },
      secondary: { label: 'Register', href: '/register' },
      cards: [
        { tag: 'Setup', title: 'Onboarding', body: 'Set up your profile and preferred payment rail before the first request.', href: '/onboarding', foot: 'Open onboarding →' },
        { tag: 'Buyer', title: 'Buyer cabinet', body: 'Requests, quotes, deals, cart, checkout, and orders appear after login.', href: '/signin?returnTo=/requests', foot: 'Open buyer sign in →' },
        { tag: 'Supplier', title: 'Supplier cabinet', body: 'RFQ inbox, sent quotes, deals, orders, and shipments appear after login.', href: '/signin?returnTo=/quotes', foot: 'Open supplier sign in →' },
        { tag: 'Admin', title: 'Admin cabinet', body: 'Users, products, deals, orders, and notifications become visible after authentication.', href: '/signin?returnTo=/admin', foot: 'Open admin sign in →' }
      ] satisfies CabinetCard[]
    };
  }

  if (viewer.role === 'supplier') {
    return {
      eyebrow: 'Supplier cabinet',
      title: variant === 'admin' ? 'Supplier operations, catalog, and shipment control.' : 'RFQ inbox, product catalog, deals, and shipments.',
      description:
        'Use the role-aware surfaces that match the supplier flow. Product creation, RFQs, quotes, and deal progression stay in one authenticated workspace.',
      primary: { label: 'Open Products', href: '/supplier/products' },
      secondary: { label: 'Open RFQ Inbox', href: '/quotes' },
      cards: [
        { tag: 'Setup', title: 'Onboarding', body: 'Confirm company and banking basics before sending quotes.', href: '/onboarding', foot: 'Open onboarding →' },
        { tag: 'Catalog', title: 'Products', body: 'Create, edit, publish, and unpublish supplier catalog records from one dashboard.', href: '/supplier/products', foot: 'Open product dashboard →' },
        { tag: 'Inbox', title: 'RFQ Inbox', body: 'Review incoming RFQs and send quotes from the live supplier board.', href: '/quotes', foot: 'Open inbox →' },
        { tag: 'Quotes', title: 'Sent quotes', body: 'Track submitted quotes and their accepted states from the deal pipeline.', href: '/deals', foot: 'View quotes →' },
        { tag: 'Deals', title: 'Deals', body: 'Follow accepted quotes into escrow, shipping, and completion.', href: '/deals', foot: 'Open deals →' },
        { tag: 'Payouts', title: 'Payouts', body: 'Review held, releasable, and released funds from the supplier flow.', href: '/supplier/payouts', foot: 'Open payouts →' },
        { tag: 'Banking', title: 'Payout settings', body: 'Keep supplier receiving details up to date for releases and invoices.', href: '/supplier/payout-settings', foot: 'Open payout settings →' },
        { tag: 'Orders', title: 'Orders', body: 'Review retail order history and fulfillment from the same workspace.', href: '/orders', foot: 'Open orders →' },
        { tag: 'Shipments', title: 'Shipments', body: 'Move into shipping and logistics without leaving the marketplace.', href: '/shipping', foot: 'Open shipments →' },
        { tag: 'Notifications', title: 'Notifications', body: 'Track market activity, order state changes, and lifecycle updates.', href: '/notifications', foot: 'Open notifications →' }
      ] satisfies CabinetCard[]
    };
  }

  if (viewer.role === 'logistics') {
    return {
      eyebrow: 'Logistics cabinet',
      title: variant === 'admin' ? 'Assigned shipments and freight control.' : 'Assigned shipments, delivery, and completion.',
      description:
        'Logistics users see only their assigned shipments. Shipment updates, delivery milestones, and notifications stay tied to the same marketplace record.',
      primary: { label: 'Open Logistics', href: '/logistics' },
      secondary: { label: 'Notifications', href: '/notifications' },
      cards: [
        { tag: 'Setup', title: 'Company info', body: 'Keep logistics company details up to date for assignment and contact routing.', href: '/admin/partners', foot: 'Open partners →' },
        { tag: 'Shipments', title: 'Assigned shipments', body: 'See only shipments assigned to your logistics company.', href: '/logistics', foot: 'Open logistics board →' },
        { tag: 'Status', title: 'Shipment updates', body: 'Move shipment status from accepted to in transit, delivered, and completed.', href: '/logistics', foot: 'Open shipments →' },
        { tag: 'Notifications', title: 'Notifications', body: 'Assignment changes and shipment updates appear in-app.', href: '/notifications', foot: 'Open notifications →' }
      ] satisfies CabinetCard[]
    };
  }

  if (viewer.role === 'customs') {
    return {
      eyebrow: 'Customs cabinet',
      title: variant === 'admin' ? 'Assigned customs cases and clearance control.' : 'Assigned customs cases, clearance, and issues.',
      description:
        'Customs brokers see only their assigned cases. Documents, clearance updates, and issue flags stay visible in one role-specific workspace.',
      primary: { label: 'Open Customs', href: '/customs' },
      secondary: { label: 'Notifications', href: '/notifications' },
      cards: [
        { tag: 'Setup', title: 'Company info', body: 'Keep customs broker details and contact information up to date.', href: '/admin/partners', foot: 'Open partners →' },
        { tag: 'Cases', title: 'Assigned cases', body: 'Review customs cases assigned to your broker account.', href: '/customs', foot: 'Open customs board →' },
        { tag: 'Clearance', title: 'Case updates', body: 'Advance documents_requested, under_clearance, cleared, and issue_flagged states.', href: '/customs', foot: 'Open cases →' },
        { tag: 'Notifications', title: 'Notifications', body: 'Case updates and assignment changes appear in-app.', href: '/notifications', foot: 'Open notifications →' }
      ] satisfies CabinetCard[]
    };
  }

  if (viewer.role === 'admin') {
    return {
      eyebrow: 'Admin cabinet',
      title: variant === 'admin' ? 'Manage the marketplace without breaking the trade flow.' : 'Marketplace controls, oversight, and deal monitoring.',
      description:
        'Admins can see the whole marketplace surface area: users, products, deals, and orders. The underlying escrow lifecycle stays untouched.',
      primary: { label: 'API Connections', href: '/admin/api-connections' },
      secondary: { label: 'Bank Details', href: '/admin/api-connections/banks' },
      cards: [
        { tag: 'Setup', title: 'Onboarding', body: 'Configure providers, bank details, compliance, and email before the pilot.', href: '/onboarding', foot: 'Open onboarding →' },
        { tag: 'Users', title: 'Users', body: 'Inspect user and role state from the admin surface.', href: '/admin', foot: 'Open users →' },
        { tag: 'Partners', title: 'Partners', body: 'Manage logistics, customs, insurance, surveyors, and banks from one admin block.', href: '/admin/partners', foot: 'Open partners →' },
        { tag: 'SMTP', title: 'SMTP settings', body: 'Configure outbound email and test delivery safely from the control plane.', href: '/admin/settings/smtp', foot: 'Open SMTP settings →' },
        { tag: 'Connections', title: 'API Connections', body: 'Configure payment providers, routing, and email from the control plane.', href: '/admin/api-connections', foot: 'Open connections →' },
        { tag: 'Banks', title: 'Banks', body: 'Edit receiving details, invoice prefixes, compliance, and signatures.', href: '/admin/api-connections/banks', foot: 'Open banks →' },
        { tag: 'Payments', title: 'Payment ops', body: 'Review payments, webhooks, manual proof, and reconciliation.', href: '/admin/payments', foot: 'Open payment ops →' },
        { tag: 'Review', title: 'Review queue', body: 'Process mismatches, proof uploads, and admin payment decisions.', href: '/admin/payments/review', foot: 'Open review queue →' },
        { tag: 'Compliance', title: 'KYC approvals', body: 'Review buyer B2B, supplier, logistics, and customs onboarding submissions.', href: '/admin/compliance', foot: 'Open compliance →' },
        { tag: 'Ledger', title: 'Payment ledger', body: 'Track payment, payout, and release timelines from the ops surface.', href: '/admin/payments', foot: 'Open ledger →' },
        { tag: 'Products', title: 'Products', body: 'Review catalog content, seller inventory, and product status.', href: '/products', foot: 'Open products →' },
        { tag: 'Deals', title: 'Deals', body: 'Monitor the escrow lifecycle and current deal state.', href: '/deals', foot: 'Open deals →' },
        { tag: 'Orders', title: 'Orders', body: 'Review order history and post-accept lifecycle surfaces.', href: '/orders', foot: 'Open orders →' },
        { tag: 'Notifications', title: 'Notifications', body: 'See role-aware activity updates without switching pages.', href: '/notifications', foot: 'Open notifications →' }
      ] satisfies CabinetCard[]
    };
  }

  return {
    eyebrow: 'Buyer cabinet',
    title: 'Requests, quotes, deals, and orders in one place.',
    description:
      'Buyers move from product discovery into RFQ creation, quote review, escrow funding, and final delivery confirmation without losing the thread.',
    primary: { label: 'Open Requests', href: '/requests' },
    secondary: { label: 'Open Deals', href: '/deals' },
      cards: [
        { tag: 'Setup', title: 'Onboarding', body: 'Complete profile and payment basics before placing live orders.', href: '/onboarding', foot: 'Open onboarding →' },
        { tag: 'Cart', title: 'Cart', body: 'Add products to a persistent cart before checkout.', href: '/cart', foot: 'Open cart →' },
        { tag: 'Checkout', title: 'Checkout', body: 'Enter shipping details and move the order forward.', href: '/checkout', foot: 'Open checkout →' },
        { tag: 'RFQ', title: 'Requests', body: 'Create and review RFQs from the buyer request board.', href: '/requests', foot: 'Open requests →' },
        { tag: 'Quotes', title: 'Quotes', body: 'Review supplier quotes and accept the right one to create a deal.', href: '/deals', foot: 'Open quotes →' },
        { tag: 'Payments', title: 'Payments', body: 'See every payment linked to your orders and deals in one place.', href: '/buyer/payments', foot: 'Open payments →' },
        { tag: 'Escrow', title: 'Deals', body: 'Fund escrow, track shipping, and complete the lifecycle.', href: '/deals', foot: 'Open deals →' },
        { tag: 'Orders', title: 'Orders', body: 'Keep order history and delivery follow-up in the same surface.', href: '/orders', foot: 'Open orders →' },
        { tag: 'Notifications', title: 'Notifications', body: 'See market activity and lifecycle updates.', href: '/notifications', foot: 'Open notifications →' }
    ] satisfies CabinetCard[]
  };
}

function QuickLinks({ copy }: { copy: ReturnType<typeof cabinetCopy> }) {
  // Show only the most important 4-6 links as quick-action buttons, not a full card grid.
  const links = copy.cards.slice(0, 6);
  if (!links.length) return null;

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle} style={{ marginBottom: 14 }}>Quick actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {links.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={styles.buttonSecondary}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, padding: '12px 16px', borderRadius: 14, textDecoration: 'none', height: 'auto' }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.55 }}>{card.tag}</span>
            <span style={{ fontWeight: 700 }}>{card.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function RoleCabinetPage({
  viewer,
  variant = 'dashboard',
  overview
}: {
  viewer: MarketplaceViewer;
  variant?: 'dashboard' | 'admin';
  overview?: ReactNode;
}) {
  const copy = cabinetCopy(viewer, variant);

  return (
    // No cards= prop — the card grid was confusing noise that duplicated the nav.
    <RouteShell eyebrow={copy.eyebrow} title={copy.title} description={copy.description} primary={copy.primary} secondary={copy.secondary}>
      {overview ? <div style={{ marginBottom: 18 }}>{overview}</div> : null}

      <QuickLinks copy={copy} />
    </RouteShell>
  );
}
