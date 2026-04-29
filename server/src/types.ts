export type Rating = 'PERFECT' | 'GOOD' | 'MISS';

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  finished: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  inGame: boolean;
  songId: string | null;
  startAt: number | null;
  createdAt: number;
  scoreTickInterval: NodeJS.Timeout | null;
  finalResultsTimeout: NodeJS.Timeout | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  ready: boolean;
}

export interface RoomStatePayload {
  code: string;
  hostId: string;
  players: PublicPlayer[];
  inGame: boolean;
}

export interface CreateRoomReq {
  playerName: string;
}

export interface JoinRoomReq {
  roomCode: string;
  playerName: string;
}

export type EnterRoomRes =
  | { ok: true; playerId: string; state: RoomStatePayload }
  | { ok: false; error: string };

export interface SetReadyReq {
  ready: boolean;
}

export interface TimeSyncReq {
  clientTime: number;
}

export interface TimeSyncRes {
  clientTime: number;
  serverTime: number;
}

export interface StartGameReq {
  songId: string;
}

export interface StartGameBroadcast {
  songId: string;
  startAt: number;
}

export interface NoteHitReq {
  noteIndex: number;
  rating: Rating;
  delta: number;
}

export interface PlayerHitBroadcast {
  playerId: string;
  noteIndex: number;
  rating: Rating;
}

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  combo: number;
}

export interface ScoreTickBroadcast {
  scores: PlayerScore[];
}

export interface GameEndReq {
  finalScore: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  finalScore: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  rank: number;
}

export interface FinalResultsBroadcast {
  results: PlayerResult[];
}
