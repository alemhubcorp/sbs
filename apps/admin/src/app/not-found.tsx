import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 24px',
        fontFamily: '"Inter", "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#334155'
      }}
    >
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '32px 40px',
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Page not found</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          This page doesn&apos;t exist or you may not have permission to view it.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '9px 20px',
            borderRadius: 8,
            background: '#15803d',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
