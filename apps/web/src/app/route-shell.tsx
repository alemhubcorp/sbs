import Link from 'next/link';
import type { ReactNode } from 'react';
import { getMarketplaceViewer, getRoleLabel, type MarketplaceRole } from '../lib/marketplace-viewer';
import { getPublicPlatformSettings } from './platform-public-settings';
import { RouteShellControls } from './route-shell-controls';
import styles from './route-shell.module.css';

// Admin panel is a separate Next.js app served by Traefik at /admin.
// All admin links MUST be absolute URLs so the browser does a hard navigation
// through Traefik (not client-side routing via the web app router).
const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://alemhub.sbs/admin';

type RouteCard = {
  tag: string;
  title: string;
  body: string;
  href: string;
  foot?: string;
};

type RouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
  cards?: RouteCard[];
  children?: ReactNode;
};

type NavLink = {
  label: string;
  href: string;
};

const publicLinks: NavLink[] = [
  { label: 'Products', href: '/products' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'Categories', href: '/categories' },
  { label: 'Logistics', href: '/logistics' },
  { label: 'Customs', href: '/customs' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Onboarding', href: '/onboarding' }
];

const roleLinks: Record<Exclude<MarketplaceRole, 'guest'>, NavLink[]> = {
  buyer: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Onboarding', href: '/onboarding' },
    { label: 'Products', href: '/products' },
    { label: 'Cart', href: '/cart' },
    { label: 'Checkout', href: '/checkout' },
    { label: 'Requests', href: '/requests' },
    { label: 'Payments', href: '/buyer/payments' },
    { label: 'Deals', href: '/deals' },
    { label: 'Orders', href: '/orders' },
    { label: 'Notifications', href: '/notifications' }
  ],
  logistics: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Logistics', href: '/logistics' },
    { label: 'Shipments', href: '/shipping' },
    { label: 'Notifications', href: '/notifications' }
  ],
  customs: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Customs', href: '/customs' },
    { label: 'Notifications', href: '/notifications' }
  ],
  supplier: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Onboarding', href: '/onboarding' },
    { label: 'Products', href: '/supplier/products' },
    { label: 'RFQ Inbox', href: '/quotes' },
    { label: 'Payouts', href: '/supplier/payouts' },
    { label: 'Deals', href: '/deals' },
    { label: 'Orders', href: '/orders' },
    { label: 'Payout settings', href: '/supplier/payout-settings' },
    { label: 'Shipments', href: '/shipping' },
    { label: 'Notifications', href: '/notifications' }
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Onboarding', href: '/onboarding' },
    { label: 'Admin Panel', href: adminUrl },
    { label: 'Buyer payments', href: '/buyer/payments' },
    { label: 'Supplier payouts', href: '/supplier/payouts' },
    { label: 'Products', href: '/products' },
    { label: 'Deals', href: '/deals' },
    { label: 'Orders', href: '/orders' },
    { label: 'Notifications', href: '/notifications' }
  ]
};

const footerColumns = [
  {
    title: 'Marketplace',
    items: [
      { label: 'All Products', href: '/products' },
      { label: 'Vendors', href: '/vendors' },
      { label: 'Categories', href: '/categories' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Onboarding', href: '/onboarding' }
    ]
  },
  {
    title: 'Support',
    items: [
      { label: 'Help Center', href: '/help-center' },
      { label: 'Shipping Info', href: '/shipping' },
      { label: 'Returns', href: '/returns' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'About Us', href: '/about' }
    ]
  },
  {
    title: 'Account',
    items: []
  }
];

export function RouteShell({ eyebrow, title, description, primary, secondary, cards = [], children }: RouteShellProps) {
  return (
    <RouteShellContent
      eyebrow={eyebrow}
      title={title}
      description={description}
      primary={primary}
      {...(secondary ? { secondary } : {})}
      cards={cards}
      children={children}
    />
  );
}

async function RouteShellContent({ eyebrow, title, description, primary, secondary, cards = [], children }: RouteShellProps) {
  const [viewer, publicSettings] = await Promise.all([getMarketplaceViewer(), getPublicPlatformSettings()]);
  const navLinks = viewer.role === 'guest' ? publicLinks : roleLinks[viewer.role];
  const roleLabel = viewer.role === 'guest' ? null : getRoleLabel(viewer.role);
  const accountItems = viewer.isAuthenticated
    ? [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Cart', href: '/cart' },
        { label: 'Checkout', href: '/checkout' },
        { label: 'Order History', href: '/orders' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Track Order', href: '/track-order' },
        { label: 'Wishlist', href: '/wishlist' },
        ...(viewer.role === 'buyer' || viewer.role === 'admin' ? [{ label: 'Buyer payments', href: '/buyer/payments' }] : []),
        ...(viewer.role === 'supplier' || viewer.role === 'admin' ? [{ label: 'Supplier payouts', href: '/supplier/payouts' }] : []),
        ...(viewer.role === 'supplier' ? [{ label: 'Supplier products', href: '/supplier/products' }] : []),
        ...(viewer.role === 'logistics' ? [{ label: 'Logistics', href: '/logistics' }] : []),
        ...(viewer.role === 'customs' ? [{ label: 'Customs', href: '/customs' }] : []),
        ...(viewer.role === 'admin'
          ? [{ label: 'Admin Panel', href: adminUrl }]
          : [])
      ]
    : [
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register' },
        { label: 'Cart', href: '/cart' },
        { label: 'Checkout', href: '/checkout' },
        { label: 'Order History', href: '/orders' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Track Order', href: '/track-order' },
        { label: 'Wishlist', href: '/wishlist' }
      ];
  const renderedFooterColumns = footerColumns.map((column) => {
    if (column.title === 'Account') {
      return { ...column, items: accountItems };
    }

    return column;
  });
  const footerLegalLinks = publicSettings?.legalDocuments.filter((item) => item.showInFooter) ?? [];
  const brandName = publicSettings?.branding.siteName?.trim() || 'Alemhub';
  const brandMark = publicSettings?.branding.markText?.trim() || 'A';
  const brandLogoUrl = publicSettings?.branding.logoUrl?.trim() || '';
  const brandLogoAlt = publicSettings?.branding.logoAlt?.trim() || `${brandName} logo`;

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoBox}>
            {brandLogoUrl ? <img src={brandLogoUrl} alt={brandLogoAlt} className={styles.logoImage} /> : brandMark}
          </div>
          {brandName}
        </Link>
        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <RouteShellControls
          navLinks={navLinks}
          accountItems={accountItems}
          isAuthenticated={viewer.isAuthenticated}
          roleLabel={roleLabel}
        />
      </nav>

      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} />
          {eyebrow}
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.heroActions}>
          <Link href={primary.href} className={styles.btnPrimary}>
            {primary.label}
          </Link>
          {secondary ? (
            <Link href={secondary.href} className={styles.btnSecondary}>
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </section>

      {cards.length ? (
        <section className={styles.content}>
          <div className={styles.cards}>
            {cards.map((card) => (
              <Link href={card.href} className={styles.card} key={card.href}>
                <div className={styles.cardLink}>
                  <span className={styles.cardTag}>{card.tag}</span>
                  <div className={styles.cardTitle}>{card.title}</div>
                  <div className={styles.cardBody}>{card.body}</div>
                  <div className={styles.cardFoot}>{card.foot ?? 'Open page →'}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {children ? <section className={styles.content}>{children}</section> : null}

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoBox}>
                {brandLogoUrl ? <img src={brandLogoUrl} alt={brandLogoAlt} className={styles.logoImage} /> : brandMark}
              </div>
              {brandName}
            </Link>
            <p className={styles.footerAbout}>
              Your trusted B2B2C international marketplace connecting suppliers, businesses, and consumers worldwide.
            </p>
            <div className={styles.footerContact}>
              {publicSettings?.company.supportEmail ? (
                <a href={`mailto:${publicSettings.company.supportEmail}`}>✉ <span>{publicSettings.company.supportEmail}</span></a>
              ) : null}
              {publicSettings?.contacts.phones[0]?.value ? (
                <a href={`tel:${publicSettings.contacts.phones[0].value}`}>📞 {publicSettings.contacts.phones[0].value}</a>
              ) : null}
              {publicSettings?.contacts.addresses[0]?.value ? <span>📍 {publicSettings.contacts.addresses[0].value}</span> : null}
            </div>
            {publicSettings?.socials.length ? (
              <div className={styles.footerContact}>
                {publicSettings.socials.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                    {item.icon ? `${item.icon} ` : ''}
                    <span>{item.name || item.label}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          {renderedFooterColumns.map((column) => (
            <div className={styles.footerCol} key={column.title}>
              <h4>{column.title}</h4>
              <ul className={styles.footerList}>
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 {publicSettings?.company.legalName || 'Alemhub'}. All rights reserved.</span>
          <div className={styles.footerLegal}>
            {footerLegalLinks.map((item) => (
              <Link href={item.href} key={item.slug}>
                {item.footerLabel}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
