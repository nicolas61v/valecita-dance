import { randomBytes } from 'crypto';
import {
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  MAX_PLAYERS_PER_ROOM,
} from './config.js';
import type { Room, Player, RoomStatePayload, PublicPlayer } from './types.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();

  constructor() {
    setInterval(() => this.cleanupExpired(), 5 * 60 * 1000).unref();
  }

  create(hostId: string, hostName: string): Room {
    const code = this.generateUniqueCode();
    const room: Room = {
      code,
      hostId,
      players: new Map([[hostId, this.newPlayer(hostId, hostName)]]),
      inGame: false,
      songId: null,
      startAt: null,
      createdAt: Date.now(),
      scoreTickInterval: null,
      finalResultsTimeout: null,
    };
    this.rooms.set(code, room);
    this.playerToRoom.set(hostId, code);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  findByPlayerId(playerId: string): Room | undefined {
    const code = this.playerToRoom.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  join(
    code: string,
    playerId: string,
    playerName: string,
  ): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.get(code);
    if (!room) return { ok: false, error: 'room_not_found' };
    if (room.inGame) return { ok: false, error: 'game_in_progress' };
    if (room.players.size >= MAX_PLAYERS_PER_ROOM) {
      return { ok: false, error: 'room_full' };
    }
    if (room.players.has(playerId)) return { ok: true, room };

    room.players.set(playerId, this.newPlayer(playerId, playerName));
    this.playerToRoom.set(playerId, room.code);
    return { ok: true, room };
  }

  removePlayer(playerId: string): Room | undefined {
    const code = this.playerToRoom.get(playerId);
    if (!code) return undefined;
    const room = this.rooms.get(code);
    this.playerToRoom.delete(playerId);
    if (!room) return undefined;

    room.players.delete(playerId);

    if (room.players.size === 0) {
      this.destroy(room);
      return undefined;
    }
    if (room.hostId === playerId) {
      room.hostId = room.players.keys().next().value as string;
    }
    return room;
  }

  destroy(room: Room): void {
    if (room.scoreTickInterval) clearInterval(room.scoreTickInterval);
    if (room.finalResultsTimeout) clearTimeout(room.finalResultsTimeout);
    for (const playerId of room.players.keys()) {
      this.playerToRoom.delete(playerId);
    }
    this.rooms.delete(room.code);
  }

  resetForLobby(room: Room): void {
    room.inGame = false;
    room.songId = null;
    room.startAt = null;
    if (room.scoreTickInterval) {
      clearInterval(room.scoreTickInterval);
      room.scoreTickInterval = null;
    }
    if (room.finalResultsTimeout) {
      clearTimeout(room.finalResultsTimeout);
      room.finalResultsTimeout = null;
    }
    for (const p of room.players.values()) {
      p.ready = false;
      p.score = 0;
      p.combo = 0;
      p.maxCombo = 0;
      p.perfects = 0;
      p.goods = 0;
      p.misses = 0;
      p.finished = false;
    }
  }

  toPublicState(room: Room): RoomStatePayload {
    const players: PublicPlayer[] = Array.from(room.players.values()).map(
      (p) => ({ id: p.id, name: p.name, ready: p.ready }),
    );
    return {
      code: room.code,
      hostId: room.hostId,
      players,
      inGame: room.inGame,
    };
  }

  stats() {
    return {
      rooms: this.rooms.size,
      players: this.playerToRoom.size,
    };
  }

  private generateUniqueCode(): string {
    for (let attempt = 0; attempt < 16; attempt++) {
      const bytes = randomBytes(ROOM_CODE_LENGTH);
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[bytes[i] % ROOM_CODE_ALPHABET.length];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('could not generate unique room code');
  }

  private newPlayer(id: string, name: string): Player {
    return {
      id,
      name,
      ready: false,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfects: 0,
      goods: 0,
      misses: 0,
      finished: false,
    };
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const room of Array.from(this.rooms.values())) {
      if (now - room.createdAt > ROOM_TTL_MS) this.destroy(room);
    }
  }
}
