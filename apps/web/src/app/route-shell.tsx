import Link from 'next/link';
import type { ReactNode } from 'react';
import { getMarketplaceViewer, getRoleLabel, type MarketplaceRole } from '../lib/marketplace-viewer';
import styles from './route-shell.module.css';

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
    { label: 'Users', href: '/admin' },
    { label: 'Partners', href: '/admin/partners' },
    { label: 'SMTP Settings', href: '/admin/settings/smtp' },
    { label: 'API Connections', href: '/admin/api-connections' },
    { label: 'Banks', href: '/admin/api-connections/banks' },
    { label: 'Payments', href: '/admin/payments' },
    { label: 'Review', href: '/admin/payments/review' },
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
  },
  {
    title: 'Commerce',
    items: [
      { label: 'Cart', href: '/cart' },
      { label: 'Checkout', href: '/checkout' },
      { label: 'Orders', href: '/orders' },
      { label: 'Notifications', href: '/notifications' }
    ]
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookies', href: '/cookies' }
    ]
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
  const viewer = await getMarketplaceViewer();
  const navLinks = viewer.role === 'guest' ? publicLinks : roleLinks[viewer.role];
  const roleLabel = viewer.role === 'guest' ? null : getRoleLabel(viewer.role);
  const accountItems = viewer.isAuthenticated
    ? [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Logout', href: '/auth/logout' },
        { label: 'Cart', href: '/cart' },
        { label: 'Checkout', href: '/checkout' },
        { label: 'Order History', href: '/orders' },
        { label: 'Notifications', href: '/notifications' },
        { label: 'Track Order', href: '/track-order' },
        { label: 'Wishlist', href: '/wishlist' },
        ...(viewer.role === 'buyer' || viewer.role === 'admin' ? [{ label: 'Buyer payments', href: '/buyer/payments' }] : []),
        ...(viewer.role === 'supplier' || viewer.role === 'admin' ? [{ label: 'Supplier payouts', href: '/supplier/payouts' }] : []),
        ...(viewer.role === 'logistics' ? [{ label: 'Logistics', href: '/logistics' }] : []),
        ...(viewer.role === 'customs' ? [{ label: 'Customs', href: '/customs' }] : []),
        ...(viewer.role === 'admin'
          ? [
              { label: 'API Connections', href: '/admin/api-connections' },
              { label: 'Banks', href: '/admin/api-connections/banks' },
              { label: 'Partners', href: '/admin/partners' },
              { label: 'SMTP Settings', href: '/admin/settings/smtp' },
              { label: 'Payments', href: '/admin/payments' },
              { label: 'Review', href: '/admin/payments/review' }
            ]
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
  const renderedFooterColumns = footerColumns.map((column) =>
    column.title === 'Account' ? { ...column, items: accountItems } : column
  );

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoBox}>SC</div>
          Safe-Contract
        </Link>
        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className={styles.navActions}>
          <Link href="/notifications" className={styles.navPill} aria-label="Notifications">
            🔔
          </Link>
          <span className={styles.navPill}>🌐 USD</span>
          <span className={styles.navPill}>EN</span>
          {roleLabel ? <span className={styles.navPill}>{roleLabel}</span> : null}
          {viewer.isAuthenticated ? (
            <>
              <Link href="/dashboard" className={styles.btnLight}>
                Dashboard
              </Link>
              <Link href="/auth/logout" className={styles.btnDark}>
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link href="/signin" className={styles.btnDark}>
                Sign In
              </Link>
              <Link href="/register" className={styles.btnLight}>
                Register
              </Link>
            </>
          )}
        </div>
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
              <div className={styles.logoBox}>SC</div>
              Safe-Contract
            </Link>
            <p className={styles.footerAbout}>
              Your trusted B2B2C international marketplace connecting suppliers, businesses, and consumers worldwide.
            </p>
            <div className={styles.footerContact}>
              <a href="mailto:[email protected]">✉ <span>[email protected]</span></a>
              <a href="tel:+17372370456">📞 +1 737 237 0456</a>
              <span>📍 USA · Kazakhstan · AIFC</span>
            </div>
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
          <span>© 2025 United IT Capital. All rights reserved.</span>
          <div className={styles.footerLegal}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
