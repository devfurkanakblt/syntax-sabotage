import cors from 'cors'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../../shared/socketProtocol'
import { LobbyService } from './services/lobbyService'
import { registerHandlers } from './socket/registerHandlers'

const PORT = Number(process.env.PORT ?? 4001)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? '*'

const app = express()
app.use(cors({ origin: FRONTEND_ORIGIN, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'syntax-sabotage-server' })
})

const server = http.createServer(app)

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
})

const lobbyService = new LobbyService()

io.on('connection', (socket) => {
  registerHandlers(io, socket, lobbyService)
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on :${PORT}`)
})
