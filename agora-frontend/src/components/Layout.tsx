import { Sidebar, SIDEBAR_RAIL_WIDTH } from './Sidebar'
import { Topbar } from './Topbar'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#18181b' }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          marginLeft: SIDEBAR_RAIL_WIDTH, // reserve space for the collapsed rail;
          // the expanded hover state overlays on top via position:fixed + z-index,
          // so content never jumps/reflows when the sidebar expands
        }}
      >
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#18181b' }}>
          {children}
        </main>
      </div>
    </div>
  )
}