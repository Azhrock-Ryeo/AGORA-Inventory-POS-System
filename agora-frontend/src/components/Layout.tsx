import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#0f172a' }}>
          {children}
        </main>
      </div>
    </div>
  )
}