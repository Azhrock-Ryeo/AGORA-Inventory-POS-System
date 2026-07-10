import { createServer } from 'http'
import app from './app'
import { initSocket } from './utils/socket'
import { redis } from './utils/redis'

const PORT = process.env.PORT || 3000

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

async function shutdown(signal: string) {
  console.log(`\n[Server] Received ${signal}, shutting down gracefully...`)

  httpServer.close(() => {
    console.log('[Server] HTTP server closed')
  })

  try {
    await redis.quit()
    console.log('[Server] Redis connection closed')
  } catch (err) {
    console.error('[Server] Error closing Redis:', err)
  }

  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))