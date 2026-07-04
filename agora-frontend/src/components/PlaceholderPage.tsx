const BG_CARD  = '#1e293b'
const BORDER   = '#334155'
const ACCENT   = '#f59e0b'
const TEXT_PRIMARY = '#f1f5f9'
const TEXT_MUTED   = '#94a3b8'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '4rem 2rem',
      }}
    >
      <div
        style={{
          width: 56, height: 56, borderRadius: 14,
          background: BG_CARD, border: `1px solid ${BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 16,
        }}
      >
        🚧
      </div>
      <h2 style={{ color: TEXT_PRIMARY, fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>
        {title}
      </h2>
      <p style={{ color: TEXT_MUTED, fontSize: 13, margin: 0 }}>
        This page hasn't been built yet.
      </p>
      <span
        style={{
          marginTop: 14, fontSize: 11, fontWeight: 600,
          padding: '4px 12px', borderRadius: 20,
          background: 'rgba(245,158,11,0.12)', color: ACCENT,
        }}
      >
        In Development
      </span>
    </div>
  )
}