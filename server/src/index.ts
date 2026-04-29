import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PORT } from './config.js';
import { RoomManager } from './rooms.js';
import { registerHandlers } from './handlers.js';

const app = express();
const rooms = new RoomManager();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    ...rooms.stats(),
  });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingInterval: 2000,
  pingTimeout: 5000,
});

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id} from ${socket.handshake.address}`);
  registerHandlers(io, socket, rooms);
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} reason=${reason}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`[shutdown] ${signal} received`);
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
