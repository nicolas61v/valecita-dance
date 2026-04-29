import type { Server, Socket } from 'socket.io';
import type { RoomManager } from './rooms.js';
import {
  COUNTDOWN_MS,
  SCORE_TICK_INTERVAL_MS,
  FINAL_RESULTS_TIMEOUT_MS,
  NAME_MAX_LENGTH,
} from './config.js';
import type {
  CreateRoomReq,
  JoinRoomReq,
  EnterRoomRes,
  SetReadyReq,
  TimeSyncReq,
  TimeSyncRes,
  StartGameReq,
  StartGameBroadcast,
  NoteHitReq,
  PlayerHitBroadcast,
  ScoreTickBroadcast,
  GameEndReq,
  FinalResultsBroadcast,
  PlayerResult,
  Rating,
} from './types.js';

const POINTS_BY_RATING: Record<Rating, number> = {
  PERFECT: 300,
  GOOD: 100,
  MISS: 0,
};

type Ack<T> = ((res: T) => void) | undefined;

export function registerHandlers(
  io: Server,
  socket: Socket,
  rooms: RoomManager,
): void {
  socket.on(
    'create_room',
    (req: CreateRoomReq, ack: Ack<EnterRoomRes>) => {
      const name = sanitizeName(req?.playerName);
      if (!name) return ack?.({ ok: false, error: 'invalid_name' });

      detachFromCurrentRoom(io, socket, rooms);
      const room = rooms.create(socket.id, name);
      socket.join(room.code);

      ack?.({
        ok: true,
        playerId: socket.id,
        state: rooms.toPublicState(room),
      });
    },
  );

  socket.on('join_room', (req: JoinRoomReq, ack: Ack<EnterRoomRes>) => {
    const name = sanitizeName(req?.playerName);
    const code =
      typeof req?.roomCode === 'string'
        ? req.roomCode.toUpperCase().trim()
        : '';
    if (!name) return ack?.({ ok: false, error: 'invalid_name' });
    if (!code) return ack?.({ ok: false, error: 'invalid_code' });

    detachFromCurrentRoom(io, socket, rooms);
    const result = rooms.join(code, socket.id, name);
    if (!result.ok) return ack?.({ ok: false, error: result.error });

    socket.join(code);
    ack?.({
      ok: true,
      playerId: socket.id,
      state: rooms.toPublicState(result.room),
    });
    broadcastRoomState(io, rooms, code);
  });

  socket.on('set_ready', (req: SetReadyReq) => {
    const room = rooms.findByPlayerId(socket.id);
    if (!room || room.inGame) return;
    const player = room.players.get(socket.id);
    if (!player) return;
    player.ready = !!req?.ready;
    broadcastRoomState(io, rooms, room.code);
  });

  socket.on('leave_room', () => {
    detachFromCurrentRoom(io, socket, rooms);
  });

  socket.on('time_sync', (req: TimeSyncReq, ack: Ack<TimeSyncRes>) => {
    ack?.({
      clientTime: typeof req?.clientTime === 'number' ? req.clientTime : 0,
      serverTime: Date.now(),
    });
  });

  socket.on('start_game', (req: StartGameReq) => {
    const room = rooms.findByPlayerId(socket.id);
    if (!room) return;
    if (room.hostId !== socket.id) return;
    if (room.inGame) return;
    const songId = typeof req?.songId === 'string' ? req.songId.trim() : '';
    if (!songId) return;

    for (const p of room.players.values()) {
      if (p.id !== room.hostId && !p.ready) return;
    }

    rooms.resetForLobby(room);
    room.inGame = true;
    room.songId = songId;
    room.startAt = Date.now() + COUNTDOWN_MS;

    const payload: StartGameBroadcast = {
      songId,
      startAt: room.startAt,
    };
    io.to(room.code).emit('start_game', payload);

    room.scoreTickInterval = setInterval(() => {
      const r = rooms.get(room.code);
      if (!r || !r.inGame) return;
      const tick: ScoreTickBroadcast = {
        scores: Array.from(r.players.values()).map((p) => ({
          id: p.id,
          name: p.name,
          score: p.score,
          combo: p.combo,
        })),
      };
      io.to(r.code).emit('score_tick', tick);
    }, SCORE_TICK_INTERVAL_MS);
  });

  socket.on('note_hit', (req: NoteHitReq) => {
    const room = rooms.findByPlayerId(socket.id);
    if (!room || !room.inGame) return;
    const player = room.players.get(socket.id);
    if (!player || player.finished) return;

    const rating = req?.rating;
    if (rating !== 'PERFECT' && rating !== 'GOOD' && rating !== 'MISS') return;
    const noteIndex = Number.isFinite(req?.noteIndex) ? req.noteIndex : -1;
    if (noteIndex < 0) return;

    if (rating === 'MISS') {
      player.combo = 0;
      player.misses += 1;
    } else {
      player.combo += 1;
      player.maxCombo = Math.max(player.maxCombo, player.combo);
      if (rating === 'PERFECT') player.perfects += 1;
      else player.goods += 1;
      const comboMult = 1 + Math.floor(player.combo / 10);
      player.score += POINTS_BY_RATING[rating] * comboMult;
    }

    const broadcast: PlayerHitBroadcast = {
      playerId: socket.id,
      noteIndex,
      rating,
    };
    socket.to(room.code).emit('player_hit', broadcast);
  });

  socket.on('game_end', (_req: GameEndReq) => {
    const room = rooms.findByPlayerId(socket.id);
    if (!room || !room.inGame) return;
    const player = room.players.get(socket.id);
    if (!player || player.finished) return;

    player.finished = true;

    const allFinished = Array.from(room.players.values()).every(
      (p) => p.finished,
    );
    if (allFinished) {
      finalizeGame(io, rooms, room.code);
    } else if (!room.finalResultsTimeout) {
      room.finalResultsTimeout = setTimeout(() => {
        finalizeGame(io, rooms, room.code);
      }, FINAL_RESULTS_TIMEOUT_MS);
    }
  });

  socket.on('disconnect', () => {
    detachFromCurrentRoom(io, socket, rooms);
  });
}

function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().slice(0, NAME_MAX_LENGTH);
  return trimmed.replace(/[\x00-\x1F\x7F]/g, '');
}

function broadcastRoomState(
  io: Server,
  rooms: RoomManager,
  code: string,
): void {
  const room = rooms.get(code);
  if (!room) return;
  io.to(code).emit('room_state', rooms.toPublicState(room));
}

function detachFromCurrentRoom(
  io: Server,
  socket: Socket,
  rooms: RoomManager,
): void {
  const room = rooms.findByPlayerId(socket.id);
  if (!room) return;
  socket.leave(room.code);
  const remaining = rooms.removePlayer(socket.id);
  if (!remaining) return;

  broadcastRoomState(io, rooms, remaining.code);

  if (remaining.inGame && remaining.players.size <= 1) {
    finalizeGame(io, rooms, remaining.code);
  }
}

function finalizeGame(
  io: Server,
  rooms: RoomManager,
  code: string,
): void {
  const room = rooms.get(code);
  if (!room || !room.inGame) return;

  const sorted = Array.from(room.players.values()).sort(
    (a, b) => b.score - a.score,
  );
  const results: PlayerResult[] = sorted.map((p, i) => ({
    id: p.id,
    name: p.name,
    finalScore: p.score,
    maxCombo: p.maxCombo,
    perfects: p.perfects,
    goods: p.goods,
    misses: p.misses,
    rank: i + 1,
  }));

  const payload: FinalResultsBroadcast = { results };
  io.to(code).emit('final_results', payload);

  rooms.resetForLobby(room);
  io.to(code).emit('room_state', rooms.toPublicState(room));
}
