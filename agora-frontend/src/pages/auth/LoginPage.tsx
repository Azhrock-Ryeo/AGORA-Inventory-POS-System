import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import api from '../../services/api'

// ── unified charcoal / white / amber theme (matches Sidebar/Topbar/Dashboard) ─
const colors = {
  pageBg: '#18181b',
  panelBg: '#111113',
  formBg: '#1f1f23',
  border: 'rgba(255,255,255,0.08)',
  inputBorder: 'rgba(255,255,255,0.18)',
  textPrimary: '#f4f4f5',
  textMuted: '#a1a1aa',
  textMutedDark: '#71717a',
  amber: '#f59e0b',
  errorBg: 'rgba(239,68,68,0.12)',
  errorText: '#f87171',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
      })

      setAuth(data.user, data.accessToken)
      navigate('/dashboard')
    } catch (err: any) {
      const status = err?.response?.status

      if (status === 401 || status === 400) {
        setError('Invalid email or password.')
      } else if (!err?.response) {
        setError('Unable to reach the server. Check your connection and try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: colors.pageBg,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          display: 'flex',
          borderRadius: '10px',
          overflow: 'hidden',
          border: `1px solid ${colors.border}`,
          minHeight: '520px',
        }}
      >
        {/* Ledger panel */}
        <div
          style={{
            flex: '0 0 42%',
            background: colors.panelBg,
            padding: '44px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: '28px',
                color: colors.textPrimary,
                letterSpacing: '0.3px',
              }}
            >
              AGORA
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: colors.textMuted,
                marginTop: '4px',
              }}
            >
              Inventory and POS
            </div>
          </div>

          <div>
            <svg width="200" height="90" viewBox="0 0 200 90" style={{ display: 'block', marginBottom: '16px' }}>
              <g stroke={colors.amber} strokeWidth={3} strokeLinecap="round" fill="none">
                <line x1="10" y1="10" x2="10" y2="70" />
                <line x1="25" y1="10" x2="25" y2="70" />
                <line x1="40" y1="10" x2="40" y2="70" />
                <line x1="55" y1="10" x2="55" y2="70" />
                <line x1="2" y1="65" x2="63" y2="15" />
                <line x1="85" y1="10" x2="85" y2="70" />
                <line x1="100" y1="10" x2="100" y2="70" />
                <line x1="115" y1="10" x2="115" y2="70" />
              </g>
            </svg>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: colors.textMutedDark,
                lineHeight: 1.5,
              }}
            >
              Every sale, tallied and tracked.
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div
          style={{
            flex: '1',
            background: colors.formBg,
            padding: '48px 44px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '21px',
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: '4px',
              }}
            >
              Sign in to your store
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: colors.textMuted,
                marginBottom: '26px',
              }}
            >
              Cashier, manager, or admin — same door.
            </div>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  background: colors.errorBg,
                  color: colors.errorText,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  marginBottom: '18px',
                }}
              >
                {error}
              </div>
            )}

            <label
              htmlFor="login-email"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: colors.textMuted,
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="name@yourstore.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                borderBottom: `1.5px solid ${colors.inputBorder}`,
                background: 'transparent',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: colors.textPrimary,
                padding: '8px 2px',
                borderRadius: 0,
                marginBottom: '18px',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />

            <label
              htmlFor="login-password"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: colors.textMuted,
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                border: 'none',
                borderBottom: `1.5px solid ${colors.inputBorder}`,
                background: 'transparent',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: colors.textPrimary,
                padding: '8px 2px',
                borderRadius: 0,
                marginBottom: '26px',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
              }}
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: colors.amber,
                color: '#18181b',
                border: 'none',
                borderRadius: '8px',
                padding: '13px',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: '.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>

            <div
              style={{
                textAlign: 'center',
                fontFamily: "'Inter', sans-serif",
                fontSize: '12px',
                color: colors.textMutedDark,
                marginTop: '20px',
              }}
            >
              Trouble signing in? Ask your store admin.
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}