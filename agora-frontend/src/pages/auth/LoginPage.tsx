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

  const handleLogin = async () => {
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
    } catch {
      setError('Invalid email or password.')
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
      <div
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
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
            }}
          >
            Email
          </label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '15px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600,
            }}
          >
            Password
          </label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid #ccc',
              fontSize: '15px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div
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
          onClick={handleLogin}
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
      </div>
    </div>
  )
}