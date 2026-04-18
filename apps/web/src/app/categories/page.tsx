import { RouteShell } from '../route-shell';

export default function CategoriesPage() {
  return (
    <RouteShell
      eyebrow="Categories"
      title="All the major marketplace categories are reachable now."
      description="Use this route to move through product families without hitting blank pages or hash links."
      primary={{ label: 'Open Products', href: '/products' }}
      secondary={{ label: 'Open Logistics', href: '/logistics' }}
      cards={[
        { tag: 'Metals', title: 'Metals and minerals', body: 'Industrial supply, commodities, and export-grade lots.', href: '/products', foot: 'See metal listings →' },
        { tag: 'Auto', title: 'Vehicles and parts', body: 'Spare parts, fleets, and transport-linked inventory.', href: '/products', foot: 'See auto listings →' },
        { tag: 'Retail', title: 'Consumer goods', body: 'Everyday retail categories for smaller orders and faster checkout.', href: '/products', foot: 'See retail listings →' }
      ]}
    />
  );
}
