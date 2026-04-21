import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { getCatalogAuctions, formatMoney } from '../catalog-data';
import styles from '../core-flow.module.css';

export default async function AuctionsPage() {
  const { auctions, error } = await getCatalogAuctions();

  return (
    <RouteShell
      eyebrow="Auctions"
      title="Live B2B auction inventory with real bids and supplier-linked products."
      description="Auction listings are backed by the marketplace database and stay attached to product cards, supplier profiles, and the same downstream RFQ and escrow flow."
      primary={{ label: 'Wholesale Listing', href: '/products/wholesale' }}
      secondary={{ label: 'All Products', href: '/products' }}
    >
      <div className={styles.grid}>
        {error ? <div className={styles.errorBox}>{error}</div> : null}
        {!auctions.length ? <div className={styles.emptyState}>No active auctions right now.</div> : null}
        <div className={styles.list}>
          {auctions.map((auction) => (
            <article className={styles.quoteCard} key={auction.id}>
              <div className={styles.rfqHead}>
                <div>
                  <div className={styles.title}>{auction.product.name}</div>
                  <div className={styles.inlineMeta}>
                    <span>Supplier: {auction.product.sellerProfile?.displayName ?? 'Unknown supplier'}</span>
                    <span>Ends: {new Date(auction.endsAt).toLocaleString()}</span>
                    <span>Status: {auction.status}</span>
                  </div>
                </div>
                <span className={`${styles.status} ${styles.statusWarning}`}>Auction</span>
              </div>
              <div className={styles.inlineMeta}>
                <span>Starting bid: {formatMoney(auction.startingBidMinor, auction.currency)}</span>
                <span>Current bid: {formatMoney(auction.currentBidMinor ?? auction.startingBidMinor, auction.currency)}</span>
                <span>Reserve: {formatMoney(auction.reserveBidMinor ?? auction.startingBidMinor, auction.currency)}</span>
              </div>
              <div className={styles.subtle}>
                Highest bidder: {auction.bids?.[0]?.buyerProfile?.displayName ?? 'No bids yet'}
              </div>
              <div className={styles.buttonRow}>
                <Link href={`/products/${auction.product.slug}`} className={styles.button}>
                  Open Product Card
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </RouteShell>
  );
}
