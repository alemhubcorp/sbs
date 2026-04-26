import Link from 'next/link';

export default function SettingsIndexPage() {
  const sections = [
    { href: '/settings/smtp', title: 'SMTP / Email', description: 'Configure outbound email delivery, sender identity, and notification routing.' },
    { href: '/settings/platform', title: 'Platform settings', description: 'Set fees, feature flags, default currencies, and marketplace-wide configuration.' },
    { href: '/settings/legal', title: 'Legal documents', description: 'Manage terms of service, privacy policy, and other legal page content.' }
  ];

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Settings</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Configure platform-wide settings, email, and legal documents.</p>
      </section>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            style={{
              display: 'block',
              padding: 24,
              borderRadius: 26,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(148,163,184,0.18)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'box-shadow 0.15s'
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#0f172a' }}>{section.title}</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>{section.description}</p>
            <div style={{ marginTop: 16, fontSize: 13, color: '#0d9488', fontWeight: 500 }}>Open →</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
