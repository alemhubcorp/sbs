'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CatalogProduct } from './catalog-data';
import { availabilityLabel, currentProductAmount, formatMoney } from './catalog-data';
import styles from './core-flow.module.css';

type WishlistProduct = Pick<
  CatalogProduct,
  | 'id'
  | 'slug'
  | 'name'
  | 'targetMarket'
  | 'availabilityStatus'
  | 'minimumOrderQuantity'
  | 'inventoryQuantity'
  | 'prices'
  | 'salePriceMinor'
  | 'saleStartsAt'
  | 'saleEndsAt'
  | 'category'
  | 'sellerProfile'
>;

const wishlistKey = 'alemhub_wishlist_product_ids';
const wishlistEventName = 'alemhub:wishlist';

function readWishlistIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(wishlistKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeWishlistIds(ids: string[]) {
  window.localStorage.setItem(wishlistKey, JSON.stringify(Array.from(new Set(ids))));
  window.dispatchEvent(new CustomEvent(wishlistEventName));
}

function useWishlistIds() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const refresh = () => setIds(readWishlistIds());

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener(wishlistEventName, refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(wishlistEventName, refresh);
    };
  }, []);

  return ids;
}

function priceLabel(product: WishlistProduct) {
  const price = product.prices?.[0];

  if (!price) {
    return 'Request price';
  }

  return formatMoney(currentProductAmount(product), price.currency);
}

function toggleProduct(productId: string, isSaved: boolean) {
  const currentIds = readWishlistIds();
  writeWishlistIds(isSaved ? currentIds.filter((id) => id !== productId) : [productId, ...currentIds]);
}

export function WishlistButton({ product, compact = false }: { product: WishlistProduct; compact?: boolean }) {
  const ids = useWishlistIds();
  const isSaved = ids.includes(product.id);

  return (
    <button
      type="button"
      className={`${compact ? styles.wishlistButtonCompact : styles.wishlistButton} ${isSaved ? styles.wishlistButtonActive : ''}`}
      onClick={() => toggleProduct(product.id, isSaved)}
      aria-pressed={isSaved}
    >
      {isSaved ? 'Saved' : 'Save'}
    </button>
  );
}

export function WishlistSummary({ products }: { products: WishlistProduct[] }) {
  const ids = useWishlistIds();
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product] as const)), [products]);
  const savedProducts = ids.map((id) => productById.get(id)).filter((product): product is WishlistProduct => Boolean(product));

  return (
    <div className={styles.grid}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Saved products</div>
            <div className={styles.muted}>
              {savedProducts.length ? `${savedProducts.length} product(s) saved in this browser.` : 'No saved products yet.'}
            </div>
          </div>
          <div className={styles.buttonRow}>
            <Link href="/products" className={styles.button}>
              Browse Products
            </Link>
            {savedProducts.length ? (
              <button type="button" className={styles.buttonSecondary} onClick={() => writeWishlistIds([])}>
                Clear Wishlist
              </button>
            ) : null}
          </div>
        </div>

        {!savedProducts.length ? (
          <div className={styles.emptyState}>
            Open the product catalog and press Save on any product. Saved products will appear here and stay available after refresh.
          </div>
        ) : (
          <div className={styles.catalogGrid}>
            {savedProducts.map((product) => (
              <article className={styles.catalogCard} key={product.id}>
                <div className={styles.catalogCardInner}>
                  <div className={styles.catalogTop}>
                    <span className={styles.pill}>{product.targetMarket.toUpperCase()}</span>
                    <span className={`${styles.status} ${product.availabilityStatus === 'in_stock' ? styles.statusSuccess : styles.statusWarning}`}>
                      {availabilityLabel(product.availabilityStatus)}
                    </span>
                  </div>
                  <Link href={`/products/${product.slug}`} className={styles.catalogName}>
                    {product.name}
                  </Link>
                  <div className={styles.catalogMeta}>
                    <div>{product.category?.name ?? 'Uncategorized'}</div>
                    <div>{product.sellerProfile?.displayName ?? 'Unknown seller'}</div>
                    <div>{priceLabel(product)}</div>
                    <div>
                      MOQ {product.minimumOrderQuantity ?? 1}
                      {product.inventoryQuantity !== null && product.inventoryQuantity !== undefined ? ` · ${product.inventoryQuantity} units` : ''}
                    </div>
                  </div>
                  <div className={styles.catalogFoot}>
                    <Link href={`/products/${product.slug}`} className={styles.catalogAction}>
                      Open card →
                    </Link>
                    <WishlistButton product={product} compact />
                  </div>
                  <div className={styles.buttonRow}>
                    <Link href={product.targetMarket === 'b2b' ? `/products/${product.slug}` : '/cart'} className={styles.buttonSecondary}>
                      {product.targetMarket === 'b2b' ? 'Request Quote' : 'Open Cart'}
                    </Link>
                    <Link href="/requests" className={styles.buttonSecondary}>
                      RFQ Board
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
