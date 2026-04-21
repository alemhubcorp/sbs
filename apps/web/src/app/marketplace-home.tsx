'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import styles from './marketplace-home.module.css';
import type { PublicPlatformSettings } from './platform-public-settings';

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetMarket: string;
  description?: string | null;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null };
  sellerProfile?: { displayName?: string | null };
};

type Card = {
  id: string;
  title: string;
  category: string;
  origin: string;
  moq: string;
  price: string;
  badge: string;
  badgeTone: 'red' | 'amber' | 'blue' | 'teal';
  image: string;
  live?: boolean;
  productId?: string;
  sellerName?: string;
  description?: string;
};

const marqueeItems = [
  'Agricultural Products','Precious Metals','Metals & Minerals','Heavy Equipment',
  'Vehicles & Auto Parts','Consumer Electronics','Apparel & Fashion','Food & Beverages',
  'Chemicals & Plastics','Petrochemicals','Metals & Minerals','Heavy Equipment',
  'Vehicles & Auto Parts','Consumer Electronics','Apparel & Fashion','Food & Beverages',
];

const steps = [
  { num: '01', title: 'Register & Verify', body: 'Create your account and choose your role. KYB/KYC verification builds counterparty trust.' },
  { num: '02', title: 'Place an Order', body: 'Browse listings, post a purchase request, or negotiate terms directly with the supplier.' },
  { num: '03', title: 'Escrow Payment', body: 'Buyer funds locked in escrow. Seller ships with the guarantee of payment on delivery.' },
  { num: '04', title: 'Confirm & Release', body: 'Buyer confirms receipt. Funds transferred to seller instantly. Deal closed on record.' },
];

const features = [
  { icon: <IconShield />, title: 'Trade Assurance', body: 'Escrow-protected payments. Funds released only on confirmed delivery.' },
  { icon: <IconGavel />,  title: 'Live Auctions',  body: 'Real-time competitive bidding for bulk commodities and industrial lots.' },
  { icon: <IconClock />,  title: 'Pre-orders',     body: 'Commit to future deliveries with full escrow cover from day one.' },
  { icon: <IconTruck />,  title: 'Logistics',      body: 'Rail, sea and road. Live freight rates, booking and tracking in every deal.' },
  { icon: <IconCredit />, title: 'Installment & Credit', body: '24-month deferred payment and factoring via integrated bank partners.' },
  { icon: <IconChart />,  title: 'Analytics',      body: 'Seller dashboard with demand data, product metrics and promotional tools.' },
];

const whyChecks = [
  { title: 'No letters of credit required', body: 'Digital escrow replaces expensive bank procedures - processing in hours, not weeks.' },
  { title: 'Verified counterparties only',  body: 'KYB/KYC checks on all business accounts before any money moves.' },
  { title: 'Dispute resolution in 7 days',  body: '95% of disputes resolved within 7 business days by our specialists.' },
  { title: 'Registered in USA & Kazakhstan', body: 'Contracts enforceable across multiple legal systems including AIFC.' },
];

const testimonials = [
  { initials: 'AK', name: 'Aibek Khasanov',    role: 'Director, Agro Trade KZ', accent: 'linear-gradient(135deg,#0b1a33,#0d7a5f)', text: 'We exported 500 tons of wheat to the UAE. The escrow system gave our buyer full confidence, and payment arrived within 24 hours of delivery confirmation.' },
  { initials: 'MR', name: 'Mohammed Al-Rashid', role: 'Procurement Manager, Dubai', accent: 'linear-gradient(135deg,#0d7a5f,#0ea87f)', text: "Importing equipment from China was always risky with wire transfers. Alemhub's escrow removed all the risk — I only released funds after inspecting the shipment." },
  { initials: 'SP', name: 'Sergei Petrov',      role: 'CEO, TM Power',            accent: 'linear-gradient(135deg,#1a4fd8,#3b82f6)', text: 'The auction feature helped us sell steel billets at 12% above asking price. Seven bidders competed in real time — results impossible through traditional channels.' },
];

const staticCards: Card[] = [
  { id: 'gold',    title: 'Gold, 24k refined',      category: 'Metals',           origin: 'Azerbaijan', moq: 'Min: 1 kg',      price: '$48,500 /unit', badge: 'Spot',      badgeTone: 'red',   image: 'linear-gradient(135deg,#4a2d08 0%,#b8822a 100%)' },
  { id: 'steel',   title: 'Steel billets, export',  category: 'Metals & Minerals', origin: 'Kazakhstan', moq: 'Min: 20 MT',     price: '$680 /MT',      badge: 'B2B',       badgeTone: 'blue',  image: 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)' },
  { id: 'laptop',  title: 'Ruflo Demo Laptop',      category: 'Electronics',       origin: 'China',      moq: 'Min: 50 units',  price: '$1,040 /unit',  badge: 'B2B',       badgeTone: 'amber', image: 'linear-gradient(135deg,#0a4535 0%,#0d7a5f 100%)' },
  { id: 'sensor',  title: 'Atlas Escrow Sensor',    category: 'Electronics',       origin: 'Kazakhstan', moq: 'MOQ on request', price: '$2,499 /unit',  badge: 'B2B',       badgeTone: 'blue',  image: 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)' },
  { id: 'almonds', title: 'Almonds, raw premium',   category: 'Agriculture',       origin: 'Azerbaijan', moq: 'Min: 100 kg',    price: '$340 /unit',    badge: 'Group buy', badgeTone: 'teal',  image: 'linear-gradient(135deg,#5c3b10 0%,#b07830 100%)' },
  { id: 'auto',    title: 'Vehicle parts inventory', category: 'Auto Parts',       origin: 'UAE',        moq: 'Min: 10 sets',   price: '$89 /unit',     badge: 'Retail',    badgeTone: 'amber', image: 'linear-gradient(135deg,#3a1a48 0%,#9b3878 100%)' },
];

function priceFromProduct(p: Product) {
  const price = p.prices?.[0];
  if (!price) return 'Request price';
  return `${price.currency} ${(price.amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function initials(name: string) {
  return name.split(/\s+/).map(t => t[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function liveCardsFromProducts(products: Product[]): Card[] {
  const tones = ['red', 'amber', 'blue'] as const;
  return products.map((p, i) => ({
    id: p.id, title: p.name,
    category: p.category?.name?.trim() || 'General trade',
    origin: 'Global', moq: p.targetMarket === 'b2c' ? 'Min: 1 unit' : 'Min: request',
    price: priceFromProduct(p),
    badge: p.targetMarket === 'b2c' ? 'Retail' : 'B2B',
    badgeTone: tones[i % tones.length]!,
    image: i % 3 === 0 ? 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)' : i % 3 === 1 ? 'linear-gradient(135deg,#0a4535 0%,#0d7a5f 100%)' : 'linear-gradient(135deg,#5c3b10 0%,#b07830 100%)',
    live: true, productId: p.id,
    sellerName: p.sellerProfile?.displayName || 'Unknown seller',
    description: p.description || 'Supplier-seeded product.',
  }));
}

function badgeClass(tone: Card['badgeTone']) {
  if (tone === 'amber') return styles.badgeAmber;
  if (tone === 'blue')  return styles.badgeBlue;
  if (tone === 'teal')  return styles.badgeTeal;
  return styles.badgeRed;
}

export function MarketplaceHome({ healthStatus, products, publicSettings }: {
  healthStatus: string; products: Product[]; publicSettings: PublicPlatformSettings | null;
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [loadingByProduct, setLoadingByProduct] = useState<Record<string, boolean>>({});
  const [successByProduct, setSuccessByProduct] = useState<Record<string, string>>({});
  const [errorByProduct, setErrorByProduct]     = useState<Record<string, string>>({});

  const liveCards = useMemo(() => liveCardsFromProducts(products), [products]);
  const cards = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const combined = [...liveCards, ...staticCards];
    if (!q) return combined;
    return combined.filter(c => [c.title, c.category, c.origin, c.sellerName ?? '', c.description ?? ''].join(' ').toLowerCase().includes(q));
  }, [deferredQuery, liveCards]);

  async function requestQuote(card: Card) {
    if (!card.live || !card.productId) { window.location.href = '/signin?returnTo=/requests'; return; }
    setLoadingByProduct(s => ({ ...s, [card.id]: true }));
    setErrorByProduct(s => ({ ...s, [card.id]: '' }));
    setSuccessByProduct(s => ({ ...s, [card.id]: '' }));
    try {
      const res = await fetch('/api/contract/rfq', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: card.productId, qty: 1 }),
      });
      const txt = await res.text();
      let body: unknown = null;
      try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
      if (!res.ok) throw new Error(
        typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
          ? body.message : `Request failed with status ${res.status}`
      );
      setSuccessByProduct(s => ({ ...s, [card.id]: 'RFQ created.' }));
    } catch (e) {
      setErrorByProduct(s => ({ ...s, [card.id]: e instanceof Error ? e.message : 'Unable to create RFQ.' }));
    } finally {
      setLoadingByProduct(s => ({ ...s, [card.id]: false }));
    }
  }

  return (
    <main className={styles.page}>
      {/* NAV */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoMark}>SC</div>
          Alemhub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/products">Products</Link>
          <Link href="/vendors">Vendors</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/logistics">Logistics</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <label className={styles.navSearch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="text" placeholder="Search products, vendors…" value={query} onChange={e => setQuery(e.target.value)} />
        </label>
        <div className={styles.navRight}>
          <span className={styles.navChip}>USD</span>
          <span className={styles.navChip}>EN</span>
          <span className={styles.navChip} title={healthStatus === 'ok' ? 'API ok' : 'API unavailable'}
            style={{ color: healthStatus === 'ok' ? 'var(--teal)' : 'var(--danger-tx)' }}>
            {healthStatus === 'ok' ? '●' : '○'}
          </span>
          <Link href="/signin" className={styles.btnSignIn}>Sign In</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} />
            <span className={styles.heroEyebrowText}>Global B2B2C Trade Ecosystem</span>
          </div>
          <h1 className={styles.heroH1}>
            International trade,<br />
            <span>safe and transparent</span>
          </h1>
          <p className={styles.heroSub}>
            Connect with suppliers and businesses worldwide. Source products, build your business, and reach customers across borders — every deal protected by escrow.
          </p>
          <div className={styles.heroCta}>
            <Link href="/products" className={styles.btnPrimary}>
              Explore Products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link href="/register/supplier" className={styles.btnSecondary}>Become a Vendor</Link>
          </div>
          <div className={styles.heroTrust}>
            {[
              { icon: <IconGlobe />, strong: '180+', text: 'countries' },
              { icon: <IconShield />, strong: 'Escrow-protected', text: 'transactions' },
              { icon: <IconCheck />, strong: 'KYB/KYC', text: 'verified vendors' },
              { icon: <IconCredit />, strong: 'Multi-currency', text: 'payments' },
            ].map(item => (
              <div className={styles.trustItem} key={item.strong}>
                <div className={styles.trustIcon}>{item.icon}</div>
                <span className={styles.trustText}><strong>{item.strong}</strong> {item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className={styles.statsBar}>
        {[
          { value: products.length || 2, em: '+', label: 'Protected transaction volume' },
          { value: 180, em: '+', label: 'Countries connected' },
          { value: 13, em: '', label: 'Participant account types' },
          { value: 18, em: '', label: 'Platform languages' },
        ].map(s => (
          <div className={styles.statItem} key={s.label}>
            <div className={styles.statValue}>{s.value}<em>{s.em}</em></div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* MARQUEE */}
      <div className={styles.marquee}>
        <div className={styles.marqueeTrack}>
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span className={styles.marqueeItem} key={`${item}-${i}`}>{item}</span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionEyebrow}>How it works</div>
        <div className={styles.sectionTitle}>Four steps to a protected deal</div>
        <div className={styles.steps}>
          {steps.map(s => (
            <div className={styles.step} key={s.num}>
              <div className={styles.stepNum}>{s.num}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepDesc}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* B2B PRODUCTS */}
      <section className={styles.prodSection} id="products">
        <div className={styles.prodHead}>
          <div className={styles.prodHeadLeft}>
            <span className={`${styles.marketTag} ${styles.tagB2b}`}>B2B</span>
            <span className={styles.prodHeadTitle}>Wholesale &amp; Industrial Supply</span>
          </div>
          <Link href="/products" className={styles.viewAll}>All B2B listings →</Link>
        </div>
        <div className={styles.prodGrid}>
          {cards.slice(0, 6).map(card => {
            const isLoading = Boolean(loadingByProduct[card.id]);
            const statusText = successByProduct[card.id] || errorByProduct[card.id];
            return (
              <button type="button" className={styles.card} key={card.id} onClick={() => void requestQuote(card)}>
                <div className={styles.cardImg} style={{ background: card.image }}>
                  <span className={`${styles.cardBadge} ${badgeClass(card.badgeTone)}`}>{card.badge}</span>
                  <span className={styles.cardInitials}>{initials(card.title)}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardCat}>{card.category}</div>
                  <div className={styles.cardName}>{card.title}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardOrigin}>{card.origin}</span>
                    <span className={styles.cardMoq}>{card.moq}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.cardPrice}>{card.price}</div>
                    <div className={styles.cardEscrow}>{isLoading ? 'Loading…' : 'Escrow'}</div>
                  </div>
                  {statusText && (
                    <div className={statusText.includes('failed') || statusText.includes('Unable') ? styles.cardError : styles.cardSuccess}>
                      {statusText}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* B2C PRODUCTS */}
      <section className={styles.prodSection} id="retail">
        <div className={styles.prodHead}>
          <div className={styles.prodHeadLeft}>
            <span className={`${styles.marketTag} ${styles.tagB2c}`}>B2C</span>
            <span className={styles.prodHeadTitle}>Consumer &amp; Retail Supply</span>
          </div>
          <Link href="/products" className={styles.viewAll}>All B2C listings →</Link>
        </div>
        <div className={styles.prodGrid}>
          {staticCards.map(card => (
            <div className={styles.card} key={card.id}>
              <div className={styles.cardImg} style={{ background: card.image }}>
                <span className={`${styles.cardBadge} ${badgeClass(card.badgeTone)}`}>{card.badge}</span>
                <span className={styles.cardInitials}>{initials(card.title)}</span>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardCat}>{card.category}</div>
                <div className={styles.cardName}>{card.title}</div>
                <div className={styles.cardMeta}>
                  <span className={styles.cardOrigin}>{card.origin}</span>
                  <span className={styles.cardMoq}>{card.moq}</span>
                </div>
                <div className={styles.cardFooter}>
                  <div className={styles.cardPrice}>{card.price}</div>
                  <div className={styles.cardEscrow}>Escrow</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className={styles.featSection} id="features">
        <div className={styles.featInner}>
          <div className={styles.sectionEyebrow}>Platform capabilities</div>
          <div className={styles.sectionTitle}>Everything your trade needs, in one place</div>
          <div className={styles.featGrid}>
            {features.map(f => (
              <div className={styles.feat} key={f.title}>
                <div className={styles.featIconBox}>{f.icon}</div>
                <div className={styles.featTitle}>{f.title}</div>
                <div className={styles.featDesc}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className={styles.whySection} id="why">
        <div className={styles.whyInner}>
          <div>
            <div className={styles.sectionEyebrow}>Why Alemhub</div>
            <div className={styles.sectionTitle}>Built on trust<br />at every step</div>
            <div className={styles.whyChecks}>
              {whyChecks.map(item => (
                <div className={styles.whyCheck} key={item.title}>
                  <div className={styles.checkMark}><IconCheck /></div>
                  <div>
                    <div className={styles.checkTitle}>{item.title}</div>
                    <div className={styles.checkDesc}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.escrowCard}>
            <div className={styles.escrowCardHead}>
              <div className={styles.escrowCardEyebrow}>Escrow flow</div>
              <div className={styles.escrowCardTitle}>How every deal is protected</div>
            </div>
            <div className={styles.escrowSteps}>
              {[
                { n: 1, cls: styles.en1, title: 'Buyer deposits to escrow', body: 'Payment held securely — not accessible to seller until delivery confirmed.' },
                { n: 2, cls: styles.en2, title: 'Seller sees funds & ships', body: 'Full confidence to ship — seller knows payment is locked and waiting.' },
                { n: 3, cls: styles.en3, title: 'Optional surveyor inspection', body: 'Independent quality check. Report attached directly to the deal.' },
                { n: 4, cls: styles.en4, title: 'Buyer confirms → funds released', body: 'Payment transferred immediately. Both parties protected throughout.' },
              ].map(step => (
                <div className={styles.escrowStep} key={step.n}>
                  <span className={`${styles.escrowNum} ${step.cls}`}>{step.n}</span>
                  <div>
                    <div className={styles.escrowStepTitle}>{step.title}</div>
                    <div className={styles.escrowStepDesc}>{step.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className={styles.testiSection} id="testimonials">
        <div className={styles.testiInner}>
          <div className={styles.sectionEyebrow} style={{ textAlign: 'center' }}>Testimonials</div>
          <div className={styles.sectionTitle} style={{ textAlign: 'center' }}>Trusted by traders worldwide</div>
          <div className={styles.testiGrid}>
            {testimonials.map(t => (
              <div className={styles.testiCard} key={t.name}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.testiText}>"{t.text}"</p>
                <div className={styles.testiAuthor}>
                  <div className={styles.testiAvatar} style={{ background: t.accent }}>{t.initials}</div>
                  <div>
                    <div className={styles.testiName}>{t.name}</div>
                    <div className={styles.testiRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <div>
            <div className={styles.ctaTitle}>Start Your Business Today</div>
            <p className={styles.ctaSub}>Join thousands of vendors selling products to customers around the world. Set up your account in minutes.</p>
          </div>
          <div className={styles.ctaBtns}>
            <Link href="/register/supplier" className={styles.btnCtaTeal}>Become a Vendor →</Link>
            <Link href="/pricing" className={styles.btnCtaGhost}>Book a Demo</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.logo}>
              <div className={styles.logoMark}>SC</div>
              Alemhub
            </Link>
            <p className={styles.footerAbout}>Your trusted B2B2C international marketplace connecting suppliers, businesses, and consumers worldwide.</p>
            <div className={styles.footerContacts}>
              {publicSettings?.company.supportEmail && <a href={`mailto:${publicSettings.company.supportEmail}`}>{publicSettings.company.supportEmail}</a>}
              {publicSettings?.contacts.phones[0]?.value && <a href={`tel:${publicSettings.contacts.phones[0].value}`}>{publicSettings.contacts.phones[0].value}</a>}
              {publicSettings?.contacts.addresses[0]?.value && <span>{publicSettings.contacts.addresses[0].value}</span>}
            </div>
          </div>
          {[
            { title: 'Marketplace', items: [['All Products','/products'],['Vendors','/vendors'],['Categories','/categories'],['Auctions','/pricing'],['Pre-orders','/how-it-works']] },
            { title: 'Support',     items: [['Help Center','/help-center'],['Shipping Info','/shipping'],['Returns','/returns'],['Contact Us','/contact'],['About Us','/about']] },
            { title: 'My Account',  items: [['Sign In','/signin'],['Register','/register'],['Order History','/orders'],['Track Order','/track-order'],['Wishlist','/wishlist']] },
          ].map(col => (
            <div className={styles.footerCol} key={col.title}>
              <h4>{col.title}</h4>
              <ul>{col.items.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}</ul>
            </div>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.footerCopy}>© 2026 {publicSettings?.company.legalName || 'Alemhub'}. All rights reserved.</span>
          <div className={styles.footerLegal}>
            {(publicSettings?.legalDocuments.filter(d => d.showInFooter) ?? []).map(d => (
              <a key={d.slug} href={d.href}>{d.footerLabel}</a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── SVG Icons ────────────────────────────────────────────── */
function IconShield() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconGavel()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 13-8.5 8.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/></svg>; }
function IconClock()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconTruck()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect width="7" height="7" x="14" y="10" rx="1"/><circle cx="17.5" cy="17.5" r="2.5"/><circle cx="7.5" cy="17.5" r="2.5"/></svg>; }
function IconCredit() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>; }
function IconChart()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>; }
function IconGlobe()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
function IconCheck()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
