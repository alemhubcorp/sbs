import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouteShell } from '../../route-shell';
import { AuctionBidPanel, PreorderReservationPanel, RequestQuoteButton } from '../../core-flow-client';
import { AddToCartButton } from '../../retail-commerce-client';
import { WishlistButton } from '../../wishlist-client';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';
import {
  availabilityLabel,
  currentProductAmount,
  formatMoney,
  getCatalogProductBySlug,
  isSaleActive
} from '../../catalog-data';
import styles from '../../core-flow.module.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await getCatalogProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product not found'
    };
  }

  return {
    title: product.seoTitle || product.name,
    description: product.metaDescription || product.description || undefined
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ product, error }, viewer] = await Promise.all([getCatalogProductBySlug(slug), getMarketplaceViewer()]);

  if (error) {
    return (
      <RouteShell
        eyebrow="Product detail"
        title="Unable to load product details."
        description="The catalog service is unavailable right now. Refresh after the API recovers."
        primary={{ label: 'Back to Products', href: '/products' }}
        secondary={{ label: 'Open RFQ Board', href: '/requests' }}
      >
        <div className={styles.errorBox}>{error}</div>
      </RouteShell>
    );
  }

  if (!product) {
    notFound();
  }

  const currentPrice = currentProductAmount(product);
  const currency = product.prices?.[0]?.currency ?? 'USD';
  const saleActive = isSaleActive(product);

  return (
    <RouteShell
      eyebrow="Product detail"
      title={product.name}
      description="Use the live product card for retail checkout, wholesale RFQ, auction bidding, or preorder reservation without leaving the production marketplace."
      primary={{ label: 'All Products', href: '/products' }}
      secondary={{ label: product.targetMarket === 'b2b' ? 'Open RFQ Board' : 'Open Cart', href: product.targetMarket === 'b2b' ? '/requests' : '/cart' }}
    >
      <div className={styles.grid}>
        <article className={styles.detailCard}>
          {product.imageUrls?.[0] ? <img src={product.imageUrls[0]} alt={product.name} className={styles.detailImage} /> : null}
          <div className={styles.buttonRow}>
            <div className={`${styles.pill} ${product.targetMarket === 'b2b' ? styles.pillBlue : product.targetMarket === 'b2c' ? styles.pillAmber : styles.pillTeal}`}>
              {product.targetMarket === 'b2b' ? 'B2B' : product.targetMarket === 'b2c' ? 'B2C' : 'B2B / B2C'}
            </div>
            <span className={`${styles.status} ${product.availabilityStatus === 'in_stock' ? styles.statusSuccess : styles.statusWarning}`}>
              {availabilityLabel(product.availabilityStatus)}
            </span>
            <WishlistButton product={product} />
          </div>
          <div className={styles.sectionTitle}>{product.name}</div>
          <div className={styles.inlineMeta}>
            <div>Category: {product.category?.name ?? 'Uncategorized'}</div>
            <div>Supplier: {product.sellerProfile?.displayName ?? 'Unknown seller'}</div>
            <div>Price: {formatMoney(currentPrice, currency)}</div>
            <div>MOQ: {product.minimumOrderQuantity ?? 1}</div>
            <div>Inventory: {product.inventoryQuantity ?? 0}</div>
            {product.leadTimeDays ? <div>Lead time: {product.leadTimeDays} days</div> : null}
            {product.auction ? <div>Auction ends: {new Date(product.auction.endsAt).toLocaleString()}</div> : null}
            {product.preorderReleaseAt ? <div>Release: {new Date(product.preorderReleaseAt).toLocaleDateString()}</div> : null}
          </div>
          {saleActive && product.compareAtAmountMinor ? (
            <div className={styles.successBox}>
              Sale active: {formatMoney(product.compareAtAmountMinor, currency)} → {formatMoney(currentPrice, currency)}
            </div>
          ) : null}
          {product.description ? <div className={styles.subtle}>{product.description}</div> : null}

          {!product.isPreorderEnabled && product.availabilityStatus !== 'preorder' && product.targetMarket !== 'b2b' ? (
            <AddToCartButton product={product} viewerRole={viewer.role} />
          ) : null}
          {product.targetMarket !== 'b2c' ? <RequestQuoteButton product={product} viewerRole={viewer.role} /> : null}
          {product.auction ? <AuctionBidPanel product={product} viewerRole={viewer.role} /> : null}
          {(product.isPreorderEnabled || product.availabilityStatus === 'preorder') ? (
            <PreorderReservationPanel product={product} viewerRole={viewer.role} />
          ) : null}
        </article>

        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Commercial rails</div>
          <div className={styles.stack}>
            <div className={styles.subtle}>
              Retail inventory uses the cart and checkout flow. Wholesale inventory continues through RFQ, quote, deal, escrow, and shipping.
            </div>
            <div className={styles.inlineMeta}>
              <span>Auctions: {product.auction ? 'Active for this product' : 'Not active'}</span>
              <span>Pre-order: {product.isPreorderEnabled || product.availabilityStatus === 'preorder' ? 'Open' : 'Closed'}</span>
              <span>Sale pricing: {saleActive ? 'Active' : 'Standard pricing'}</span>
            </div>
            <div className={styles.buttonRow}>
              <Link href="/auctions" className={styles.buttonSecondary}>
                View auctions
              </Link>
              <Link href="/preorders" className={styles.buttonSecondary}>
                View pre-orders
              </Link>
              <Link href="/products/wholesale" className={styles.buttonSecondary}>
                Wholesale listing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </RouteShell>
  );
}
