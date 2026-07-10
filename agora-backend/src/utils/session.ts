export const SESSION_LOCK_TTL = 30 * 60 // 30 minutes — self-heals if a session goes stale

export function sessionKey(userId: string) {
  return `session:active:${userId}`
}