import { Capacitor } from '@capacitor/core';
import { Game, User, Sport, SkillLevel, ChatMessage, TeamId } from '../types';

// Where the API/socket server lives, resolved per runtime:
// - REACT_APP_API_URL wins if set (point at a deployed backend).
// - Native app (Capacitor iOS shell): the app is served from capacitor://,
//   so "same origin" can't reach Node. Talk to localhost:5001, which inside
//   the iOS Simulator is the Mac running the server.
// - Web production: same origin (the Node server serves the build).
// - Web dev: localhost:5001.
export const API_BASE =
  process.env.REACT_APP_API_URL ??
  (Capacitor.isNativePlatform()
    ? 'http://localhost:5001'
    : process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:5001');

const TOKEN_KEY = 'pu_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = 'Something went wrong';
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {
      /* non-JSON error */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface CreateGamePayload {
  sport: Sport;
  title: string;
  place: string;
  startsAt: string;
  maxPlayers: number;
  skill: SkillLevel;
  minAge: number;
  distanceMi?: number;
  teamsEnabled?: boolean;
}

export const api = {
  // auth
  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),

  // games
  listGames: (sport?: string, skill?: string) => {
    const q = new URLSearchParams();
    if (sport && sport !== 'all') q.set('sport', sport);
    if (skill && skill !== 'all') q.set('skill', skill);
    const qs = q.toString();
    return request<{ games: Game[] }>(`/api/games${qs ? `?${qs}` : ''}`);
  },
  getGame: (id: string) => request<{ game: Game }>(`/api/games/${id}`),
  createGame: (payload: CreateGamePayload) =>
    request<{ game: Game }>('/api/games', { method: 'POST', body: JSON.stringify(payload) }),

  // participation
  join: (id: string) => request<{ game: Game }>(`/api/games/${id}/join`, { method: 'POST' }),
  leave: (id: string) => request<{ game: Game }>(`/api/games/${id}/leave`, { method: 'POST' }),
  confirm: (id: string) => request<{ game: Game }>(`/api/games/${id}/confirm`, { method: 'POST' }),
  checkin: (id: string) => request<{ game: Game }>(`/api/games/${id}/checkin`, { method: 'POST' }),

  // teams
  setTeam: (id: string, team: TeamId | null) =>
    request<{ game: Game }>(`/api/games/${id}/team`, { method: 'POST', body: JSON.stringify({ team }) }),
  shuffleTeams: (id: string) => request<{ game: Game }>(`/api/games/${id}/teams/shuffle`, { method: 'POST' }),
  toggleTeams: (id: string) => request<{ game: Game }>(`/api/games/${id}/teams/toggle`, { method: 'POST' }),

  // chat
  sendMessage: (id: string, text: string) =>
    request<{ message: ChatMessage }>(`/api/games/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // push
  vapidKey: () => request<{ publicKey: string }>('/api/push/vapid'),
  subscribePush: (subscription: PushSubscriptionJSON) =>
    request<{ ok: boolean }>('/api/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }),
};
