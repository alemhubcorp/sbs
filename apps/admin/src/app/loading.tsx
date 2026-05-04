export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40vh',
        fontFamily: '"Inter", "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#64748b',
        fontSize: 14
      }}
    >
      <span style={{ display: 'inline-block', marginRight: 10, animation: 'spin 0.8s linear infinite' }}>⏳</span>
      Loading&hellip;
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
