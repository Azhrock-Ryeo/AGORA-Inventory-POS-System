import { createServer } from 'http'
import app from './app'
import { initSocket } from './utils/socket'

const PORT = process.env.PORT || 3000

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})