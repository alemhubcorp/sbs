'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import styles from './marketplace-home.module.css';

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
  badgeTone: 'red' | 'amber' | 'blue';
  image: string;
  live?: boolean;
  productId?: string;
  sellerName?: string;
  description?: string;
};

const marqueeItems = [
  'Agricultural Products',
  'Precious Metals',
  'Metals & Minerals',
  'Heavy Equipment',
  'Vehicles & Auto Parts',
  'Consumer Electronics',
  'Apparel & Fashion',
  'Food & Beverages',
  'Chemicals & Plastics',
  'Agricultural Products',
  'Petrochemicals',
  'Metals & Minerals',
  'Heavy Equipment',
  'Vehicles & Auto Parts',
  'Consumer Electronics',
  'Apparel & Fashion',
  'Food & Beverages',
  'Chemicals & Plastics'
];

const steps = [
  {
    num: '01',
    title: 'Register & Verify',
    body: 'Create your account and choose your role. KYB/KYC verification builds counterparty trust.'
  },
  {
    num: '02',
    title: 'Place an Order',
    body: 'Browse listings, post a purchase request, or negotiate terms directly with the supplier.'
  },
  {
    num: '03',
    title: 'Escrow Payment',
    body: 'Buyer funds locked in escrow. Seller ships with the guarantee of payment on delivery.'
  },
  {
    num: '04',
    title: 'Confirm & Release',
    body: 'Buyer confirms receipt. Funds transferred to seller instantly. Deal closed on record.'
  }
];

const features = [
  { icon: '🔒', title: 'Trade Assurance', body: 'Escrow-protected payments. Funds released only on confirmed delivery.' },
  { icon: '⚡', title: 'Live Auctions', body: 'Real-time competitive bidding for bulk commodities and industrial lots.' },
  { icon: '📋', title: 'Pre-orders', body: 'Commit to future deliveries with full escrow cover from day one.' },
  { icon: '🚚', title: 'Logistics', body: 'Rail, sea and road. Live freight rates, booking and tracking in every deal.' },
  { icon: '💳', title: 'Installment & Credit', body: '24-month deferred payment and factoring via integrated bank partners.' },
  { icon: '📊', title: 'Analytics', body: 'Seller dashboard with demand data, product metrics and promotional tools.' }
];

const whyChecks = [
  {
    title: 'No letters of credit required',
    body: 'Digital escrow replaces expensive bank procedures - processing in hours, not weeks.'
  },
  {
    title: 'Verified counterparties only',
    body: 'KYB/KYC checks on all business accounts before any money moves.'
  },
  {
    title: 'Dispute resolution in 7 days',
    body: '95% of disputes resolved within 7 business days by our specialists.'
  },
  {
    title: 'Registered in USA & Kazakhstan',
    body: 'Contracts enforceable across multiple legal systems including AIFC.'
  }
];

const testimonials = [
  {
    initials: 'AK',
    name: 'Aibek Khasanov',
    role: 'Director, Agro Trade KZ',
    text:
      '"We exported 500 tons of wheat to the UAE. The escrow system gave our buyer full confidence, and payment arrived within 24 hours of delivery confirmation."'
  },
  {
    initials: 'MR',
    name: 'Mohammed Al-Rashid',
    role: 'Procurement Manager, Dubai',
    text:
      '"Importing equipment from China was always risky with wire transfers. Safe-Contract\'s escrow removed all the risk - I only released funds after inspecting the shipment."',
    accent: 'linear-gradient(135deg,#0d7a5f,#0fa87f)'
  },
  {
    initials: 'SP',
    name: 'Sergei Petrov',
    role: 'CEO, TM Power',
    text:
      '"The auction feature helped us sell steel billets at 12% above asking price. Seven bidders competed in real time - results impossible through traditional channels."',
    accent: 'linear-gradient(135deg,#1a56db,#3b82f6)'
  }
];

const staticCards: Card[] = [
  {
    id: 'gold',
    title: 'Gold, 24k refined',
    category: 'Metals',
    origin: '🇦🇿 Azerbaijan',
    moq: 'Min: 1 kg',
    price: '$48,500 /unit',
    badge: 'Spot',
    badgeTone: 'red',
    image: 'linear-gradient(135deg,#5b3b0b 0%,#d8a14c 100%)'
  },
  {
    id: 'steel',
    title: 'Steel billets, export grade',
    category: 'Metals & Minerals',
    origin: '🇰🇿 Kazakhstan',
    moq: 'Min: 20 MT',
    price: '$680 /MT',
    badge: 'B2B',
    badgeTone: 'blue',
    image: 'linear-gradient(135deg,#10213a 0%,#1a56db 100%)'
  },
  {
    id: 'laptop',
    title: 'Ruflo Demo Laptop',
    category: 'Electronics',
    origin: '🇨🇳 China',
    moq: 'Min: 50 units',
    price: '$1,040 /unit',
    badge: 'B2B',
    badgeTone: 'amber',
    image: 'linear-gradient(135deg,#0f7a63 0%,#1b9b82 100%)'
  },
  {
    id: 'sensor',
    title: 'Atlas Escrow Sensor',
    category: 'Electronics',
    origin: '🇰🇿 Kazakhstan',
    moq: 'MOQ on request',
    price: '$2,499 /unit',
    badge: 'B2B',
    badgeTone: 'blue',
    image: 'linear-gradient(135deg,#10213a 0%,#1a56db 100%)'
  },
  {
    id: 'almonds',
    title: 'Almonds, raw, premium bag',
    category: 'Sports',
    origin: '🇦🇿 Azerbaijan',
    moq: 'Min: 100 kg',
    price: '$340 /unit',
    badge: 'Group buy',
    badgeTone: 'blue',
    image: 'linear-gradient(135deg,#7b4b16 0%,#d8a14c 100%)'
  },
  {
    id: 'auto',
    title: 'Vehicle parts inventory',
    category: 'Auto Parts',
    origin: '🇦🇪 UAE',
    moq: 'Min: 10 sets',
    price: '$89 /unit',
    badge: 'Retail',
    badgeTone: 'amber',
    image: 'linear-gradient(135deg,#5a2755 0%,#c75a96 100%)'
  }
];

function priceFromProduct(product: Product) {
  const price = product.prices?.[0];
  if (!price) {
    return 'Request price';
  }

  return `${price.currency} ${(price.amountMinor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((token) => token[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function liveCardsFromProducts(products: Product[]): Card[] {
  const tones = ['red', 'amber', 'blue'] as const;

  return products.map((product, index) => ({
    id: product.id,
    title: product.name,
    category: product.category?.name?.trim() || 'General trade',
    origin: product.targetMarket === 'b2b' ? '🌍 Global' : '🌍 Global',
    moq: product.targetMarket === 'b2c' ? 'Min: 1 unit' : 'Min: request',
    price: priceFromProduct(product),
    badge: product.targetMarket === 'b2c' ? 'Retail' : 'B2B',
    badgeTone: tones[index % tones.length]!,
    image:
      index % 3 === 0
        ? 'linear-gradient(135deg,#10213a 0%,#1a56db 100%)'
        : index % 3 === 1
          ? 'linear-gradient(135deg,#0f7a63 0%,#1b9b82 100%)'
          : 'linear-gradient(135deg,#7b4b16 0%,#d8a14c 100%)',
    live: true,
    productId: product.id,
    sellerName: product.sellerProfile?.displayName || 'Unknown seller',
    description: product.description || 'Supplier-seeded product for real RFQ to quote validation.'
  }));
}

function badgeClass(tone: Card['badgeTone']) {
  if (tone === 'amber') {
    return styles.badgeAmber;
  }

  if (tone === 'blue') {
    return styles.badgeBlue;
  }

  return styles.badgeRed;
}

function cardSymbol(card: Card) {
  return initialsFromName(card.title);
}

export function MarketplaceHome({
  healthStatus,
  products
}: {
  healthStatus: string;
  products: Product[];
}) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [loadingByProduct, setLoadingByProduct] = useState<Record<string, boolean>>({});
  const [successByProduct, setSuccessByProduct] = useState<Record<string, string>>({});
  const [errorByProduct, setErrorByProduct] = useState<Record<string, string>>({});

  const liveCards = useMemo(() => liveCardsFromProducts(products), [products]);
  const cards = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const combined = [...liveCards, ...staticCards];

    return combined.filter((card) => {
      if (!normalized) {
        return true;
      }

      return [card.title, card.category, card.origin, card.sellerName ?? '', card.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [deferredQuery, liveCards]);

  const categories = useMemo(() => {
    const total = cards.length;
    const b2b = cards.filter((card) => card.badge === 'B2B').length;
    return [
      { name: 'All', count: total },
      { name: 'Electronics', count: b2b },
      { name: 'Metals', count: 1 }
    ];
  }, [cards.length]);

  async function requestQuote(card: Card) {
    if (!card.live || !card.productId) {
      window.location.href = '/signin?returnTo=/requests';
      return;
    }

    setLoadingByProduct((current) => ({ ...current, [card.id]: true }));
    setErrorByProduct((current) => ({ ...current, [card.id]: '' }));
    setSuccessByProduct((current) => ({ ...current, [card.id]: '' }));

    try {
      const response = await fetch('/api/contract/rfq', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          productId: card.productId,
          qty: 1
        })
      });

      const bodyText = await response.text();
      let body: unknown = null;

      try {
        body = bodyText ? JSON.parse(bodyText) : null;
      } catch {
        body = bodyText;
      }

      if (!response.ok) {
        throw new Error(
          typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
            ? body.message
            : `Request failed with status ${response.status}`
        );
      }

      setSuccessByProduct((current) => ({ ...current, [card.id]: 'RFQ created.' }));
    } catch (error) {
      setErrorByProduct((current) => ({
        ...current,
        [card.id]: error instanceof Error ? error.message : 'Unable to create RFQ.'
      }));
    } finally {
      setLoadingByProduct((current) => ({ ...current, [card.id]: false }));
    }
  }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoBox}>SC</div>
          Safe-Contract
        </Link>
        <div className={styles.navLinks}>
          <Link href="/products">Products</Link>
          <Link href="/vendors">Vendors</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/logistics">Logistics</Link>
          <Link href="/pricing">Pricing</Link>
        </div>
        <label className={styles.searchBox}>
          <span style={{ color: '#9ca3af', fontSize: '.85rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Search products, vendors..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className={styles.navR}>
          <span className={styles.navPill}>🌐 USD</span>
          <span className={styles.navPill}>EN</span>
          <span className={styles.navPill} title={healthStatus === 'ok' ? 'API ok' : 'API unavailable'}>
            🛒
          </span>
          <Link href="/signin" className={styles.btnDark}>
            Sign In
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>
          <span className={styles.eyebrowDot} />
          Global B2B2C Trade Ecosystem
        </div>
        <h1>
          International trade,
          <br />
          safe and transparent
        </h1>
        <p className={styles.heroSub}>
          Connect with suppliers and businesses worldwide. Source products, build your business, and reach customers across
          borders - every deal protected by escrow.
        </p>
        <div className={styles.heroBtns}>
          <Link href="/products" className={styles.btnPrimary}>
            Explore Products →
          </Link>
          <Link href="/register/supplier" className={styles.btnSecondary}>
            Become a Vendor
          </Link>
        </div>
        <div className={styles.trustStrip}>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>🌍</div>
            <span>
              <strong>180+</strong> countries
            </span>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>🔒</div>
            <span>
              <strong>Escrow-protected</strong> transactions
            </span>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>✅</div>
            <span>
              <strong>KYB/KYC</strong> verified vendors
            </span>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>💳</div>
            <span>
              <strong>Multi-currency</strong> payments
            </span>
          </div>
        </div>
      </section>

      <section className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statVal}>
            {products.length || 2}
            <em>+</em>
          </div>
          <div className={styles.statLbl}>Protected transaction volume</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>
            {categories.length * 60}
            <em>+</em>
          </div>
          <div className={styles.statLbl}>Countries connected</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>13</div>
          <div className={styles.statLbl}>Participant account types</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal}>18</div>
          <div className={styles.statLbl}>Platform languages</div>
        </div>
      </section>

      <section className={styles.marquee}>
        <div className={styles.marqueeInner}>
          {marqueeItems.concat(marqueeItems).map((item, index) => (
            <span className={styles.mq} key={`${item}-${index}`}>
              <span className={styles.mqDot} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className={styles.section} id="how-it-works">
        <div className={styles.sectionLabel}>How it works</div>
        <div className={styles.sectionTitle}>Four steps to a protected deal</div>
        <div className={styles.steps}>
          {steps.map((step) => (
            <div className={styles.step} key={step.num}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDesc}>{step.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.prodSection} id="products">
          <div className={styles.prodRowHead}>
            <div className={styles.prodRowLeft}>
              <span className={`${styles.prodTag} ${styles.tagB2b}`}>B2B</span>
              <span className={styles.prodRowTitle}>Wholesale &amp; Industrial Supply</span>
            </div>
          <Link href="/products" className={styles.viewAll}>
            All B2B listings →
          </Link>
        </div>

        <div className={styles.pGrid}>
          {cards.slice(0, 6).map((card) => {
            const isLoading = Boolean(loadingByProduct[card.id]);
            const statusText = successByProduct[card.id] || errorByProduct[card.id];

            return (
              <button
                type="button"
                className={styles.card}
                key={card.id}
                onClick={() => void requestQuote(card)}
              >
                <div className={styles.cardImg} style={{ background: card.image }}>
                  <span className={`${styles.cardBadge} ${badgeClass(card.badgeTone)}`}>{card.badge}</span>
                  <span className={styles.cardEmoji}>{cardSymbol(card)}</span>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardCat}>{card.category}</div>
                  <div className={styles.cardName}>{card.title}</div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardOrigin}>{card.origin}</span>
                    <span className={styles.cardMoq}>{card.moq}</span>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.cardPrice}>
                      {card.price} <span>{card.live ? '' : ''}</span>
                    </div>
                    <div className={styles.cardEscrow}>{isLoading ? 'Loading...' : '🔒 Escrow'}</div>
                  </div>
                  {statusText ? (
                    <div className={statusText.includes('failed') || statusText.includes('Unable') ? styles.cardError : styles.cardSuccess}>
                      {statusText}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.prodSection} id="vendors">
          <div className={styles.prodRowHead}>
            <div className={styles.prodRowLeft}>
              <span className={`${styles.prodTag} ${styles.tagB2c}`}>B2C</span>
              <span className={styles.prodRowTitle}>Consumer &amp; Retail Supply</span>
            </div>
          <Link href="/products" className={styles.viewAll}>
            All B2C listings →
          </Link>
        </div>

        <div className={styles.pGrid}>
          {staticCards.map((card) => (
            <div className={styles.card} key={card.id}>
              <div className={styles.cardImg} style={{ background: card.image }}>
                <span className={`${styles.cardBadge} ${badgeClass(card.badgeTone)}`}>{card.badge}</span>
                <span className={styles.cardEmoji}>{cardSymbol(card)}</span>
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
                  <div className={styles.cardEscrow}>🔒 Escrow</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.featSection} id="pricing">
        <div className={styles.sectionLabel}>Platform capabilities</div>
        <div className={styles.sectionTitle}>Everything your trade needs, in one place</div>
        <div className={styles.featGrid}>
          {features.map((feature, index) => (
            <div className={styles.feat} key={feature.title}>
              <div className={styles.featIcon}>{feature.icon}</div>
              <div className={styles.featTitle}>{feature.title}</div>
              <div className={styles.featDesc}>{feature.body}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.whySection} id="logistics">
        <div>
          <div className={styles.sectionLabel}>Why Safe-Contract</div>
          <div className={styles.sectionTitle}>
            Built on trust
            <br />
            at every step
          </div>
          <div className={styles.whyChecks}>
            {whyChecks.map((item) => (
              <div className={styles.whyCheck} key={item.title}>
                <div className={styles.checkBox}>✓</div>
                <div>
                  <div className={styles.checkTitle}>{item.title}</div>
                  <div className={styles.checkBody}>{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.escrowCard}>
          <div className={styles.escrowHead}>
            <div className={styles.escrowHeadLabel}>Escrow flow</div>
            <div className={styles.escrowHeadTitle}>How every deal is protected</div>
          </div>
          <div className={styles.flowItem}>
            <div className={styles.flowNum + ' ' + styles.f1}>1</div>
            <div>
              <div className={styles.flowTitle}>Buyer deposits to escrow</div>
              <div className={styles.flowBody}>Payment held securely - not accessible to seller until delivery confirmed.</div>
            </div>
          </div>
          <div className={styles.flowItem}>
            <div className={styles.flowNum + ' ' + styles.f2}>2</div>
            <div>
              <div className={styles.flowTitle}>Seller sees funds &amp; ships</div>
              <div className={styles.flowBody}>Full confidence to ship - seller knows payment is locked and waiting.</div>
            </div>
          </div>
          <div className={styles.flowItem}>
            <div className={styles.flowNum + ' ' + styles.f3}>3</div>
            <div>
              <div className={styles.flowTitle}>Optional surveyor inspection</div>
              <div className={styles.flowBody}>Independent quality check. Report attached directly to the deal.</div>
            </div>
          </div>
          <div className={styles.flowItem}>
            <div className={styles.flowNum + ' ' + styles.f4}>4</div>
            <div>
              <div className={styles.flowTitle}>Buyer confirms → funds released</div>
              <div className={styles.flowBody}>Payment transferred immediately. Both parties protected throughout.</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.testiSection} id="categories">
        <div className={styles.sectionLabel}>Testimonials</div>
        <div className={styles.sectionTitle}>Trusted by traders worldwide</div>
        <div className={styles.testiGrid}>
          {testimonials.map((testi, index) => (
            <div className={styles.testiCard} key={testi.name}>
              <div className={styles.stars}>★★★★★</div>
              <p className={styles.testiText}>{testi.text}</p>
              <div className={styles.testiAuthor}>
                <div className={styles.tav} style={{ background: testi.accent ?? 'linear-gradient(135deg,#0d1f3c,#1a56db)' }}>
                  {testi.initials}
                </div>
                <div>
                  <div className={styles.tavName}>{testi.name}</div>
                  <div className={styles.tavRole}>{testi.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <div>
            <div className={styles.ctaTitle}>Start Your Business Today</div>
            <div className={styles.ctaSub}>
              Join thousands of vendors selling products to customers around the world. Set up your account in minutes.
            </div>
          </div>
          <div className={styles.ctaBtns}>
            <Link href="/register/supplier" className={styles.btnTeal}>
              Become a Vendor →
            </Link>
            <Link href="/pricing" className={styles.btnGhost}>
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer} id="footer">
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
              <Link href="/about">📍 USA · Kazakhstan · AIFC</Link>
            </div>
          </div>
          <div className={styles.fcol}>
            <h4>Marketplace</h4>
            <ul>
              <li>
                <a href="/products">All Products</a>
              </li>
              <li>
                <a href="/vendors">Vendors</a>
              </li>
              <li>
                <a href="/categories">Categories</a>
              </li>
              <li>
                <a href="/pricing">Auctions</a>
              </li>
              <li>
                <a href="/how-it-works">Pre-orders</a>
              </li>
            </ul>
          </div>
          <div className={styles.fcol}>
            <h4>Support</h4>
            <ul>
              <li>
                <a href="/help-center">Help Center</a>
              </li>
              <li>
                <a href="/shipping">Shipping Info</a>
              </li>
              <li>
                <a href="/returns">Returns</a>
              </li>
              <li>
                <a href="/contact">Contact Us</a>
              </li>
              <li>
                <a href="/about">About Us</a>
              </li>
            </ul>
          </div>
          <div className={styles.fcol}>
            <h4>My Account</h4>
            <ul>
              <li>
                <a href="/signin">Sign In</a>
              </li>
              <li>
                <a href="/register">Register</a>
              </li>
              <li>
                <a href="/orders">Order History</a>
              </li>
              <li>
                <a href="/track-order">Track Order</a>
              </li>
              <li>
                <a href="/wishlist">Wishlist</a>
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2025 United IT Capital. All rights reserved.</span>
          <div className={styles.footerLegal}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/cookies">Cookies</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
