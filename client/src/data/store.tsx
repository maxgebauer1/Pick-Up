import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { Game, Player, Participant, AttendanceStatus } from '../types';

// ---- helpers ---------------------------------------------------------------

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

let idc = 100;
const uid = () => `id-${idc++}`;

// ---- players ---------------------------------------------------------------

const P = {
  jordan: { id: 'p-jordan', name: 'Jordan D.', initials: 'JD', color: '#e2564d' },
  mia: { id: 'p-mia', name: 'Mia K.', initials: 'MK', color: '#1f7a4d' },
  andre: { id: 'p-andre', name: 'Andre R.', initials: 'AR', color: '#1836d6' },
  ray: { id: 'p-ray', name: 'Ray P.', initials: 'RP', color: '#8a7a2e' },
  tam: { id: 'p-tam', name: 'Tam S.', initials: 'TS', color: '#40506e' },
  luis: { id: 'p-luis', name: 'Luis B.', initials: 'LB', color: '#c9673f' },
  nina: { id: 'p-nina', name: 'Nina P.', initials: 'NP', color: '#7a5aa0' },
  dee: { id: 'p-dee', name: 'Dee K.', initials: 'DK', color: '#2f9e6a' },
  cam: { id: 'p-cam', name: 'Cam M.', initials: 'CM', color: '#d9822b' },
} satisfies Record<string, Player>;

export const CURRENT_USER: Player = { id: 'me', name: 'You', initials: 'YO', color: '#186640' };

const part = (player: Player, status: AttendanceStatus, isHost = false): Participant => ({
  player,
  status,
  isHost,
});

// ---- seed games ------------------------------------------------------------

const seedGames = (): Game[] => [
  {
    id: 'g-hoops',
    sport: 'basketball',
    title: 'Saturday Morning Run',
    place: 'Venice Beach Courts',
    distanceMi: 2.1,
    startsAt: hoursFromNow(3), // within the confirm window
    maxPlayers: 10,
    skill: 'intermediate',
    minAge: 16,
    participants: [
      part(P.jordan, 'confirmed', true),
      part(P.mia, 'confirmed'),
      part(CURRENT_USER, 'joined'),
      part(P.andre, 'joined'),
      part(P.tam, 'confirmed'),
      part(P.luis, 'confirmed'),
      part(P.cam, 'confirmed'),
      part(P.dee, 'joined'),
      part(P.ray, 'waitlisted'),
    ],
    messages: [
      { id: uid(), player: P.jordan, text: 'Bringing an extra ball, courts get busy 👀', at: hoursFromNow(-2) },
      { id: uid(), player: P.andre, text: 'Running 5 min late, save me a spot!', at: hoursFromNow(-1) },
    ],
  },
  {
    id: 'g-soccer',
    sport: 'soccer',
    title: 'Pickup Soccer',
    place: 'Mission Bay Turf',
    distanceMi: 1.2,
    startsAt: hoursFromNow(30),
    maxPlayers: 18,
    skill: 'all',
    minAge: 0,
    participants: [
      part(P.tam, 'joined', true),
      part(P.luis, 'joined'),
      part(P.nina, 'joined'),
      part(P.mia, 'joined'),
    ],
    messages: [
      { id: uid(), player: P.tam, text: 'Pinnies provided, wear dark if you can', at: hoursFromNow(-5) },
    ],
  },
  {
    id: 'g-flag',
    sport: 'flag-football',
    title: '5v5 Flag · Riverside',
    place: 'Riverside Park, Field 3',
    distanceMi: 3.4,
    startsAt: hoursFromNow(6),
    maxPlayers: 10,
    skill: 'competitive',
    minAge: 18,
    participants: [
      part(P.dee, 'confirmed', true),
      part(P.cam, 'confirmed'),
      part(P.jordan, 'confirmed'),
      part(P.andre, 'confirmed'),
      part(P.ray, 'confirmed'),
      part(P.mia, 'confirmed'),
      part(P.tam, 'confirmed'),
      part(P.luis, 'confirmed'),
      part(P.nina, 'confirmed'),
      part(P.dee, 'confirmed'),
    ],
    messages: [],
  },
  {
    id: 'g-baseball',
    sport: 'baseball',
    title: 'Weekend Baseball',
    place: 'Lincoln Diamond',
    distanceMi: 4.0,
    startsAt: hoursFromNow(48),
    maxPlayers: 18,
    skill: 'casual',
    minAge: 0,
    participants: [
      part(P.nina, 'joined', true),
      part(P.ray, 'joined'),
      part(P.dee, 'joined'),
    ],
    messages: [],
  },
];

// ---- phase derivation ------------------------------------------------------

export type Phase = 'upcoming' | 'confirm' | 'live';

export function gamePhase(game: Game): Phase {
  const hours = (new Date(game.startsAt).getTime() - Date.now()) / 3600_000;
  if (hours <= 0.25) return 'live';
  if (hours <= 4) return 'confirm';
  return 'upcoming';
}

// counts that ignore the waitlist
export function activeCount(game: Game) {
  return game.participants.filter((p) => p.status !== 'waitlisted').length;
}
export function spotsLeft(game: Game) {
  return Math.max(0, game.maxPlayers - activeCount(game));
}
export function isFull(game: Game) {
  return spotsLeft(game) === 0;
}
export function confirmedCount(game: Game) {
  return game.participants.filter((p) => p.status === 'confirmed' || p.status === 'checked-in').length;
}
export function myParticipant(game: Game): Participant | undefined {
  return game.participants.find((p) => p.player.id === CURRENT_USER.id);
}

// ---- context ---------------------------------------------------------------

interface Store {
  games: Game[];
  currentUser: Player;
  getGame: (id: string) => Game | undefined;
  join: (id: string) => void;
  leave: (id: string) => void;
  setMyStatus: (id: string, status: AttendanceStatus) => void;
  sendMessage: (id: string, text: string) => void;
  createGame: (g: Omit<Game, 'id' | 'participants' | 'messages'>) => string;
}

const StoreCtx = createContext<Store | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>(seedGames);

  const update = useCallback((id: string, fn: (g: Game) => Game) => {
    setGames((prev) => prev.map((g) => (g.id === id ? fn(g) : g)));
  }, []);

  const join = useCallback((id: string) => {
    update(id, (g) => {
      if (myParticipant(g)) return g;
      const status: AttendanceStatus = isFull(g) ? 'waitlisted' : 'joined';
      return { ...g, participants: [...g.participants, part(CURRENT_USER, status)] };
    });
  }, [update]);

  const leave = useCallback((id: string) => {
    update(id, (g) => {
      const without = g.participants.filter((p) => p.player.id !== CURRENT_USER.id);
      // promote the first waitlisted player if a spot opened
      const activeNow = without.filter((p) => p.status !== 'waitlisted').length;
      if (activeNow < g.maxPlayers) {
        const idx = without.findIndex((p) => p.status === 'waitlisted');
        if (idx !== -1) without[idx] = { ...without[idx], status: 'joined' };
      }
      return { ...g, participants: without };
    });
  }, [update]);

  const setMyStatus = useCallback((id: string, status: AttendanceStatus) => {
    update(id, (g) => ({
      ...g,
      participants: g.participants.map((p) =>
        p.player.id === CURRENT_USER.id ? { ...p, status } : p
      ),
    }));
  }, [update]);

  const sendMessage = useCallback((id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    update(id, (g) => ({
      ...g,
      messages: [...g.messages, { id: uid(), player: CURRENT_USER, text: trimmed, at: new Date().toISOString() }],
    }));
  }, [update]);

  const createGame = useCallback((g: Omit<Game, 'id' | 'participants' | 'messages'>) => {
    const id = `g-${uid()}`;
    const game: Game = {
      ...g,
      id,
      participants: [part(CURRENT_USER, 'confirmed', true)],
      messages: [],
    };
    setGames((prev) => [game, ...prev]);
    return id;
  }, []);

  const value = useMemo<Store>(
    () => ({
      games,
      currentUser: CURRENT_USER,
      getGame: (id) => games.find((g) => g.id === id),
      join,
      leave,
      setMyStatus,
      sendMessage,
      createGame,
    }),
    [games, join, leave, setMyStatus, sendMessage, createGame]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
