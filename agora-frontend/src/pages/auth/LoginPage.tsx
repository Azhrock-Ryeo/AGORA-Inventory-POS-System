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
  const [showPassword, setShowPassword] = useState(false)
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
      const backendMessage = err?.response?.data?.error

      if (!err?.response) {
        setError('Unable to reach the server. Check your connection and try again.')
      } else if (status === 401 || status === 400) {
        setError(backendMessage || 'Invalid email or password.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: colors.pageBg,
        padding: '20px',
      }}
    >
      <style>{`
        @media (max-width: 760px) {
          .login-shell { padding: 12px; }
          .login-card { flex-direction: column; min-height: auto; }
          .login-brand-panel { flex: 1 1 auto; width: 100%; padding: 28px 24px; min-height: 180px; }
          .login-form-panel { flex: 1 1 auto; width: 100%; padding: 28px 24px; }
          .login-form { max-width: 100%; }
        }
        @media (max-width: 480px) {
          .login-shell { padding: 8px; }
          .login-brand-panel { padding: 22px 18px; }
          .login-form-panel { padding: 22px 18px; }
          .login-title { font-size: 20px !important; }
          .login-subtitle { font-size: 12px !important; }
        }
      `}</style>
      <div
        className="login-card"
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
          className="login-brand-panel"
          style={{
            flex: '0 0 42%',
            background: colors.panelBg,
            padding: '44px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
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
          className="login-form-panel"
          style={{
            flex: '1',
            background: colors.formBg,
            padding: '48px 44px',
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <form className="login-form" onSubmit={handleLogin} style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.12)',
                color: colors.amber,
                fontFamily: "'Inter', sans-serif",
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: colors.amber,
                  display: 'inline-block',
                }}
              />
              Secure POS access
            </div>

            <div
              className="login-title"
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: '21px',
                fontWeight: 500,
                color: colors.textPrimary,
                marginBottom: '6px',
              }}
            >
              Welcome back
            </div>
            <div
              className="login-subtitle"
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                color: colors.textMuted,
                marginBottom: '24px',
                lineHeight: 1.5,
              }}
            >
              Sign in with your work email to continue managing sales, inventory, and reports.
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
                  borderRadius: '8px',
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
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              disabled={loading}
              autoFocus
              style={{
                width: '100%',
                border: `1px solid ${colors.inputBorder}`,
                background: 'rgba(255,255,255,0.03)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: colors.textPrimary,
                padding: '12px 14px',
                borderRadius: '12px',
                marginBottom: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                opacity: loading ? 0.6 : 1,
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
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
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  border: `1px solid ${colors.inputBorder}`,
                  background: 'rgba(255,255,255,0.03)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  color: colors.textPrimary,
                  padding: '12px 14px',
                  borderRadius: '12px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: loading ? 0.6 : 1,
                  paddingRight: '58px',
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: colors.textMuted,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
                    <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18.8 18.8 0 0 1-4.2 5.2" />
                    <path d="M6.3 6.3A18.7 18.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 3.7-.7" />
                  </svg>
                )}
              </button>
            </div>

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
                boxShadow: loading ? 'none' : '0 10px 24px rgba(245, 158, 11, 0.22)',
                transition: 'transform .15s ease, box-shadow .15s ease, opacity .15s ease',
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