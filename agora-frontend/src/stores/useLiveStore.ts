import { create } from 'zustand'

interface LiveState {
  usersChangedAt: number
  auditLogChangedAt: number
  bumpUsersChanged: () => void
  bumpAuditLogChanged: () => void
}

// Pages subscribe to these timestamps and refetch in a useEffect
// whenever the value changes — a simple pub/sub without extra deps.
export const useLiveStore = create<LiveState>()((set) => ({
  usersChangedAt: 0,
  auditLogChangedAt: 0,
  bumpUsersChanged: () => set({ usersChangedAt: Date.now() }),
  bumpAuditLogChanged: () => set({ auditLogChangedAt: Date.now() }),
}))