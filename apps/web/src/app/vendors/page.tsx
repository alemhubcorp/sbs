import { RouteShell } from '../route-shell';

export default function VendorsPage() {
  return (
    <RouteShell
      eyebrow="Suppliers"
      title="Verified vendors, manufacturers, and cross-border sellers."
      description="This page keeps vendor navigation alive while the broader supplier directory continues to grow behind the same public layout."
      primary={{ label: 'Become a Vendor', href: '/register/supplier' }}
      secondary={{ label: 'Sign In', href: '/signin' }}
      cards={[
        {
          tag: 'KYB/KYC',
          title: 'Verified counterparties',
          body: 'Vendor entry routes into the same authentication path as buyer accounts, so the main signup path stays consistent.',
          href: '/register',
          foot: 'Open registration →'
        },
        {
          tag: 'Suppliers',
          title: 'Supplier onboarding',
          body: 'Dedicated onboarding for companies that want to list inventory, answer RFQs, and close deals.',
          href: '/register/supplier',
          foot: 'Start supplier onboarding →'
        },
        {
          tag: 'Contracts',
          title: 'Trade with escrow',
          body: 'Vendor pages stay tied to the protected deal flow, not to dead marketing placeholders.',
          href: '/deals',
          foot: 'Open deals page →'
        }
      ]}
    />
  );
}
