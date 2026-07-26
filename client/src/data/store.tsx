import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Game, Participant, TeamId } from '../types';
import { api, CreateGamePayload } from '../lib/api';
import { getSocket } from '../lib/socket';

// ---- pure helpers (shared across screens) ----------------------------------

export type Phase = 'upcoming' | 'confirm' | 'live';

export function gamePhase(game: Game): Phase {
  const hours = (new Date(game.startsAt).getTime() - Date.now()) / 3600_000;
  if (hours <= 0.25) return 'live';
  if (hours <= 4) return 'confirm';
  return 'upcoming';
}
export const activeCount = (game: Game) => game.participants.filter((p) => p.status !== 'waitlisted').length;
export const spotsLeft = (game: Game) => Math.max(0, game.maxPlayers - activeCount(game));
export const isFull = (game: Game) => spotsLeft(game) === 0;
export const confirmedCount = (game: Game) =>
  game.participants.filter((p) => p.status === 'confirmed' || p.status === 'checked-in').length;
export function myParticipant(game: Game, userId?: string): Participant | undefined {
  if (!userId) return undefined;
  return game.participants.find((p) => p.player.id === userId);
}

// ---- games list context (Browse / Profile) ---------------------------------

interface Store {
  games: Game[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createGame: (payload: CreateGamePayload) => Promise<string>;
}

const StoreCtx = createContext<Store | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { games } = await api.listGames();
      setGames(games);
    } catch (e: any) {
      setError(e.message || 'Could not load games');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createGame = useCallback(async (payload: CreateGamePayload) => {
    // api.createGame already returns the fully-serialized game, so add it to
    // local state directly instead of refetching the whole list. Screens sort
    // by start time on render, so insertion order here doesn't matter.
    const { game } = await api.createGame(payload);
    setGames((prev) => [game, ...prev]);
    return game.id;
  }, []);

  // Memoized so the context value is a stable reference; consumers only
  // re-render when the underlying state actually changes, not on every
  // provider render.
  const value = useMemo(
    () => ({ games, loading, error, refresh, createGame }),
    [games, loading, error, refresh, createGame]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
};

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

// ---- single game hook (Game detail) ----------------------------------------

export function useGameDetail(gameId: string | undefined) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameRef = useRef<string | undefined>(gameId);
  gameRef.current = gameId;

  const load = useCallback(async () => {
    if (!gameId) return;
    try {
      setError(null);
      const { game } = await api.getGame(gameId);
      setGame(game);
    } catch (e: any) {
      setError(e.message || 'Could not load this game');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // initial fetch + live updates over socket
  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    load();

    const socket = getSocket();
    socket.emit('join-game', gameId);

    const onUpdate = (payload: { game: Game }) => {
      if (payload.game.id === gameRef.current) setGame(payload.game);
    };
    const onMessage = (payload: { gameId: string; message: any }) => {
      if (payload.gameId !== gameRef.current) return;
      setGame((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === payload.message.id)) return prev; // dedupe
        return { ...prev, messages: [...prev.messages, payload.message] };
      });
    };

    socket.on('game-updated', onUpdate);
    socket.on('new-message', onMessage);
    return () => {
      socket.emit('leave-game', gameId);
      socket.off('game-updated', onUpdate);
      socket.off('new-message', onMessage);
    };
  }, [gameId, load]);

  const act = useCallback(
    async (fn: () => Promise<{ game: Game }>) => {
      const { game } = await fn();
      setGame(game);
    },
    []
  );

  return {
    game,
    loading,
    error,
    join: () => gameId && act(() => api.join(gameId)),
    leave: () => gameId && act(() => api.leave(gameId)),
    confirm: () => gameId && act(() => api.confirm(gameId)),
    checkIn: () => gameId && act(() => api.checkin(gameId)),
    setTeam: (team: TeamId | null) => gameId && act(() => api.setTeam(gameId, team)),
    shuffleTeams: () => gameId && act(() => api.shuffleTeams(gameId)),
    toggleTeams: () => gameId && act(() => api.toggleTeams(gameId)),
    sendMessage: async (text: string) => {
      if (!gameId || !text.trim()) return;
      const { message } = await api.sendMessage(gameId, text);
      setGame((prev) =>
        prev && !prev.messages.some((m) => m.id === message.id)
          ? { ...prev, messages: [...prev.messages, message] }
          : prev
      );
    },
  };
}
