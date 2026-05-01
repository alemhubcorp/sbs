'use client';

export default function AdminError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: '32px 40px',
          maxWidth: 480,
          width: '100%',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#dc2626' }}>
          Something went wrong
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
          {error.message || 'An unexpected error occurred while processing your request.'}
        </p>
        {error.digest && (
          <p style={{ margin: '0 0 20px', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            Digest: {error.digest}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#15803d',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#334155',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
