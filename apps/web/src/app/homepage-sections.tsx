'use client';

import Link from 'next/link';
import styles from './marketplace-home.module.css';
import type { Card, Feature, FooterColumn, Product, Step, Testimonial, WhyCheck } from './homepage-types';
import { ArrowIcon, IconCheck, IconGlobe, IconShield, SearchIcon } from './homepage-icons';
import type { PublicPlatformSettings } from './platform-public-settings';

export function buildInitials(name: string) {
  return name
    .split(/\s+/)
    .map((token) => token[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function priceFromProduct(product: Product) {
  const price = product.prices?.[0];
  if (!price) return 'Request price';
  return `${price.currency} ${(price.amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function liveCardsFromProducts(products: Product[]): Card[] {
  const tones = ['red', 'amber', 'blue'] as const;
  return products.map((product, index) => ({
    id: product.id,
    title: product.name,
    category: product.category?.name?.trim() || 'General trade',
    origin: 'Global',
    moq: product.targetMarket === 'b2c' ? 'Min: 1 unit' : 'MOQ on request',
    price: priceFromProduct(product),
    badge: product.targetMarket === 'b2c' ? 'Retail' : 'B2B',
    badgeTone: tones[index % tones.length]!,
    image:
      index % 3 === 0
        ? 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)'
        : index % 3 === 1
          ? 'linear-gradient(135deg,#0a4535 0%,#0d7a5f 100%)'
          : 'linear-gradient(135deg,#5c3b10 0%,#b07830 100%)',
    live: true,
    productId: product.id,
    sellerName: product.sellerProfile?.displayName || 'Verified supplier',
    description: product.description || 'Supplier-seeded product.'
  }));
}

export function badgeClass(tone: Card['badgeTone']) {
  if (tone === 'amber') return styles.badgeAmber;
  if (tone === 'blue') return styles.badgeBlue;
  if (tone === 'teal') return styles.badgeTeal;
  return styles.badgeRed;
}

export function Header({
  query,
  onQueryChange,
  healthOkay
}: {
  query: string;
  onQueryChange: (value: string) => void;
  healthOkay: boolean;
}) {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.container}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>SC</span>
            <span className={styles.logoText}>
              <strong>Alemhub</strong>
              <small>Escrow marketplace</small>
            </span>
          </Link>

          <div className={styles.headerCenter}>
            <nav className={styles.navLinks} aria-label="Primary navigation">
              <Link href="/products">Products</Link>
              <Link href="/vendors">Vendors</Link>
              <Link href="/categories">Categories</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/pricing">Pricing</Link>
            </nav>

            <label className={styles.headerSearch}>
              <SearchIcon />
              <input type="text" placeholder="Search products, suppliers, categories" value={query} onChange={(event) => onQueryChange(event.target.value)} />
            </label>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.headerPill}>Global sourcing</span>
            <span className={`${styles.headerPill} ${healthOkay ? styles.headerPillLive : styles.headerPillMuted}`}>
              {healthOkay ? 'API live' : 'API offline'}
            </span>
            <Link href="/signin" className={styles.buttonGhost}>
              Sign In
            </Link>
            <Link href="/register/supplier" className={styles.buttonPrimary}>
              Become a Vendor
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Hero({ products }: { products: Product[]; livePreview: Card[]; healthOkay: boolean }) {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroContent}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Global B2B2C Trade Ecosystem
          </div>

          <h1 className={styles.heroTitle}>
            International trade,
            <br />
            safe and transparent
          </h1>

          <p className={styles.heroBody}>
            Connect with suppliers and businesses worldwide. Source products, build your business, and reach customers across borders — every deal
            protected by escrow.
          </p>

          <div className={styles.heroActions}>
            <Link href="/products" className={styles.buttonPrimary}>
              Explore Products
              <ArrowIcon />
            </Link>
            <Link href="/become-vendor" className={styles.buttonSecondary}>
              Become a Vendor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  return (
    <section className={styles.trustStripSection}>
      <div className={`${styles.container} ${styles.trustStrip}`}>
        {[
          { icon: <IconGlobe />, label: '180+ countries' },
          { icon: <IconShield />, label: 'Escrow-protected transactions' },
          { icon: <IconCheck />, label: 'KYB/KYC verified vendors' },
          { icon: <IconShield />, label: 'Multi-currency payments' }
        ].map((item) => (
          <div className={styles.trustStripItem} key={item.label}>
            <span className={styles.trustStripIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <section className={styles.statsSection}>
      <div className={`${styles.container} ${styles.statsGrid}`}>
        {[
          { value: '$2.4B+', label: 'Protected transaction volume', detail: 'Escrow-protected volume across marketplace trading flows.' },
          { value: '180+', label: 'Countries connected', detail: 'Cross-border sourcing and distribution reach.' },
          { value: '13', label: 'Participant account types', detail: 'Buyer, supplier, admin, logistics, customs and more.' },
          { value: '18', label: 'Platform languages', detail: 'Public marketplace reach across international users.' }
        ].map((item) => (
          <div className={styles.statCard} key={item.label}>
            <div className={styles.statValue}>{item.value}</div>
            <div className={styles.statLabel}>{item.label}</div>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Marquee({ items }: { items: string[] }) {
  return (
    <section className={styles.marqueeSection}>
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          {[...items, ...items].map((item, index) => (
            <span className={styles.marqueeItem} key={`${item}-${index}`}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsSection({ steps }: { steps: Step[] }) {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <div>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>A clear path from marketplace discovery to protected deal completion.</h2>
          </div>
          <p className={styles.sectionLead}>The homepage now presents the trade lifecycle as one structured system instead of separate MVP-style fragments.</p>
        </div>

        <div className={styles.stepsGrid}>
          {steps.map((step) => (
            <article className={styles.stepCard} key={step.num}>
              <span className={styles.stepNumber}>{step.num}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductGrid({
  title,
  eyebrow,
  lead,
  tagClassName,
  tag,
  browseHref,
  browseLabel,
  cards,
  onRequestQuote,
  loadingByProduct,
  successByProduct,
  errorByProduct
}: {
  title: string;
  eyebrow: string;
  lead: string;
  tagClassName?: string;
  tag: string;
  browseHref: string;
  browseLabel: string;
  cards: Card[];
  onRequestQuote?: (card: Card) => void;
  loadingByProduct?: Record<string, boolean>;
  successByProduct?: Record<string, string>;
  errorByProduct?: Record<string, string>;
}) {
  return (
    <div className={styles.catalogColumn}>
      <div className={styles.catalogHead}>
        <div>
          <span className={[styles.marketTag, tagClassName].filter(Boolean).join(' ')}>{tag}</span>
          <h3>{title}</h3>
        </div>
        <Link href={browseHref} className={styles.inlineLink}>
          {browseLabel}
        </Link>
      </div>
      <p className={styles.catalogLead}>{lead}</p>
      <div className={styles.productGrid}>
        {cards.map((card) => {
          const isLoading = Boolean(loadingByProduct?.[card.id]);
          const statusText = successByProduct?.[card.id] || errorByProduct?.[card.id];
          const interactive = Boolean(card.live && onRequestQuote);
          const body = (
            <>
              <div className={styles.productVisual} style={{ background: card.image }}>
                <span className={`${styles.productBadge} ${badgeClass(card.badgeTone)}`}>{card.badge}</span>
                <span className={styles.productInitials}>{buildInitials(card.title)}</span>
              </div>
              <div className={styles.productBody}>
                <span className={styles.productCategory}>{card.category}</span>
                <h4>{card.title}</h4>
                <p className={styles.productMeta}>
                  <span>{card.origin}</span>
                  <span>{card.moq}</span>
                </p>
                <div className={styles.productFooter}>
                  <strong>{card.price}</strong>
                  <span className={styles.productPill}>{interactive ? (isLoading ? 'Loading…' : 'Escrow') : 'Escrow'}</span>
                </div>
                {statusText ? (
                  <div className={statusText.includes('Unable') || statusText.includes('failed') ? styles.cardError : styles.cardSuccess}>{statusText}</div>
                ) : null}
              </div>
            </>
          );

          if (!interactive) {
            return (
              <div className={styles.productCard} key={card.id}>
                {body}
              </div>
            );
          }

          return (
            <button type="button" className={styles.productCard} key={card.id} onClick={() => onRequestQuote?.(card)}>
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FeaturesSection({ features }: { features: Feature[] }) {
  return (
    <section className={styles.sectionMuted}>
      <div className={styles.container}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Platform capabilities</span>
              <h2 className={styles.sectionTitle}>Everything your trade needs, in one place</h2>
            </div>
          <p className={styles.sectionLead}>Rendered through the existing app logic, but visually aligned to the Safe-Contract template.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article className={styles.featureCard} key={feature.title}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustSection({ whyChecks }: { whyChecks: WhyCheck[] }) {
  return (
    <section className={styles.section}>
        <div className={`${styles.container} ${styles.trustGrid}`}>
        <div className={styles.trustColumn}>
          <span className={styles.sectionEyebrow}>Why Safe-Contract</span>
          <h2 className={styles.sectionTitle}>Built on trust at every step</h2>
          <p className={styles.sectionLead}>Visual structure follows the Safe-Contract HTML while existing marketplace logic stays intact.</p>
          <div className={styles.checkList}>
            {whyChecks.map((item) => (
              <div className={styles.checkItem} key={item.title}>
                <span className={styles.checkIcon}>
                  <IconCheck />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.trustColumn}>
          <div className={styles.flowCard}>
            <div className={styles.flowCardHead}>
              <span>Escrow flow</span>
              <h3>How every deal is protected</h3>
            </div>
            <div className={styles.flowList}>
              {[
                { n: 1, title: 'Buyer deposits to escrow', body: 'Payment held securely — not accessible to seller until delivery confirmed.' },
                { n: 2, title: 'Seller sees funds & ships', body: 'Full confidence to ship — seller knows payment is locked and waiting.' },
                { n: 3, title: 'Optional surveyor inspection', body: 'Independent quality check. Report attached directly to the deal.' },
                { n: 4, title: 'Buyer confirms → funds released', body: 'Payment transferred immediately. Both parties protected throughout.' }
              ].map((step) => (
                <div className={styles.flowStep} key={step.n}>
                  <span className={styles.flowNumber}>{step.n}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className={styles.sectionMuted}>
      <div className={styles.container}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionEyebrow}>Testimonials</span>
            <h2 className={styles.sectionTitle}>Trusted by traders worldwide</h2>
          </div>
          <p className={styles.sectionLead}>Template presentation with preserved app structure and links.</p>
        </div>

        <div className={styles.testimonialGrid}>
          {testimonials.map((testimonial) => (
            <article className={styles.testimonialCard} key={testimonial.name}>
              <span className={styles.starRow}>★★★★★</span>
              <p>{testimonial.text}</p>
              <div className={styles.testimonialAuthor}>
                <span className={styles.testimonialAvatar} style={{ background: testimonial.accent }}>
                  {testimonial.initials}
                </span>
                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaInner}`}>
          <div>
          <span className={styles.sectionEyebrow}>Start your business today</span>
          <h2 className={styles.ctaTitle}>Start Your Business Today</h2>
          <p className={styles.ctaBody}>Join thousands of vendors selling products to customers around the world. Set up your account in minutes.</p>
        </div>
        <div className={styles.ctaActions}>
          <Link href="/register/supplier" className={styles.buttonPrimary}>
            Become a Vendor
          </Link>
          <Link href="/products" className={styles.buttonGhostOnDark}>
            Book a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer({
  publicSettings,
  footerColumns
}: {
  publicSettings: PublicPlatformSettings | null;
  footerColumns: FooterColumn[];
}) {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerTop}`}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>SC</span>
            <span className={styles.logoText}>
              <strong>Safe-Contract</strong>
              <small>Global B2B2C Trade Platform</small>
            </span>
          </Link>
          <p>Your trusted B2B2C international marketplace connecting suppliers, businesses, and consumers worldwide.</p>
          <div className={styles.footerContacts}>
            {publicSettings?.company.supportEmail ? <a href={`mailto:${publicSettings.company.supportEmail}`}>{publicSettings.company.supportEmail}</a> : null}
            {publicSettings?.contacts.phones[0]?.value ? <a href={`tel:${publicSettings.contacts.phones[0].value}`}>{publicSettings.contacts.phones[0].value}</a> : null}
            {publicSettings?.contacts.addresses[0]?.value ? <span>{publicSettings.contacts.addresses[0].value}</span> : null}
          </div>
        </div>

        {footerColumns.map((column) => (
          <div className={styles.footerColumn} key={column.title}>
            <h3>{column.title}</h3>
            <ul>
              {column.items.map((item) => (
                <li key={item[1]}>
                  <Link href={item[1]}>{item[0]}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={`${styles.container} ${styles.footerBottom}`}>
        <span>© 2026 {publicSettings?.company.legalName || 'Alemhub'}. All rights reserved.</span>
        <div className={styles.footerLegal}>
          {(publicSettings?.legalDocuments.filter((document) => document.showInFooter) ?? []).map((document) => (
            <a key={document.slug} href={document.href}>
              {document.footerLabel}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
