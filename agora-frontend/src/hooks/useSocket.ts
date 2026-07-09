import { useEffect } from 'react'
import { getSocket, disconnectSocket } from '../services/socket'
import { useStockStore } from '../stores/useStockStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useLiveStore } from '../stores/useLiveStore'

export function useSocket() {
  const { token, logout } = useAuthStore()
  const { applyStockUpdate, addAlert } = useStockStore()
  const { bumpUsersChanged, bumpAuditLogChanged } = useLiveStore()

  useEffect(() => {
    if (!token) return

    const socket = getSocket(token)

    socket.on('stock-update', (data: {
      productId: string
      productName: string
      quantity: number
    }) => {
      applyStockUpdate(data)
    })

    socket.on('low-stock-alert', (data: {
      productId: string
      productName: string
      quantity: number
      threshold: number
    }) => {
      addAlert(data)
    })

    socket.on('user:deactivated', () => {
      logout()
      disconnectSocket()
      fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).finally(() => {
        window.location.href = '/login'
      })
    })

    socket.on('users:changed', () => {
      bumpUsersChanged()
    })

    socket.on('audit:new', () => {
      bumpAuditLogChanged()
    })

    return () => {
      socket.off('stock-update')
      socket.off('low-stock-alert')
      socket.off('user:deactivated')
      socket.off('users:changed')
      socket.off('audit:new')
    }
  }, [token])
}

export function useSocketDisconnect() {
  useEffect(() => {
    return () => disconnectSocket()
  }, [])
}