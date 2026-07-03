import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'
import api from '../../services/api'

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
        background:
          'linear-gradient(135deg,#4f46e5 0%,#312e81 100%)',
        padding: '20px',
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 15px 40px rgba(0,0,0,.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              margin: 0,
              color: '#4f46e5',
              fontSize: '34px',
            }}
          >
            AGORA
          </h1>

          <p
            style={{
              color: '#666',
              marginTop: '8px',
            }}
          >
            Inventory & POS System
          </p>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label
            htmlFor="login-email"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
            }}
          >
            Email
          </label>

          <input
            id="login-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoFocus
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '15px',
              boxSizing: 'border-box',
              opacity: loading ? 0.7 : 1,
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="login-password"
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
            }}
          >
            Password
          </label>

          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '15px',
              boxSizing: 'border-box',
              opacity: loading ? 0.7 : 1,
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            style={{
              background: '#FEE2E2',
              color: '#B91C1C',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            border: 'none',
            borderRadius: '10px',
            background: '#4f46e5',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: '.2s',
          }}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>

        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#777',
            fontSize: '14px',
          }}
        >
          AGORA Inventory Management System
        </div>
      </form>
    </div>
  )
}