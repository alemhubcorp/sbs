import Link from 'next/link';
import { RouteShell } from '../route-shell';
import { getCatalogCategories } from '../catalog-data';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const { categories } = await getCatalogCategories();

  const cards = categories.map((cat) => ({
    tag: cat.slug,
    title: cat.name,
    body: cat.description ?? `Browse all products in the ${cat.name} category.`,
    href: `/products?category=${encodeURIComponent(cat.slug)}`,
    foot: `See ${cat.name} listings →`
  }));

  return (
    <RouteShell
      eyebrow="Categories"
      title="All the major marketplace categories are reachable now."
      description="Use this route to move through product families without hitting blank pages or hash links."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Logistics', href: '/logistics' }}
      cards={
        cards.length > 0
          ? cards
          : [
              { tag: 'Metals', title: 'Metals and minerals', body: 'Industrial supply, commodities, and export-grade lots.', href: '/products', foot: 'See metal listings →' },
              { tag: 'Auto', title: 'Vehicles and parts', body: 'Spare parts, fleets, and transport-linked inventory.', href: '/products', foot: 'See auto listings →' },
              { tag: 'Retail', title: 'Consumer goods', body: 'Everyday retail categories for smaller orders and faster checkout.', href: '/products', foot: 'See retail listings →' }
            ]
      }
    >
      {categories.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products?category=${encodeURIComponent(cat.slug)}`}
              style={{
                display: 'block',
                padding: '16px 20px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: '#fff',
                textDecoration: 'none',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: 14,
                transition: 'border-color 150ms, box-shadow 150ms'
              }}
            >
              {cat.name}
              {cat.description && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', fontWeight: 400, lineHeight: 1.5 }}>
                  {cat.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </RouteShell>
  );
}
