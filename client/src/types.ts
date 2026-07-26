export type Sport = 'basketball' | 'soccer' | 'baseball' | 'flag-football';

export type SkillLevel = 'casual' | 'intermediate' | 'competitive' | 'all';

// A player's relationship to a game as it moves through the show-up loop.
export type AttendanceStatus = 'joined' | 'confirmed' | 'checked-in' | 'waitlisted';

// Optional teams: the two sides a game can split into.
export type TeamId = 'a' | 'b';

export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string; // avatar background
}

export interface Participant {
  player: Player;
  status: AttendanceStatus;
  team?: TeamId | null;
  isHost?: boolean;
}

export interface ChatMessage {
  id: string;
  player: Player;
  text: string;
  at: string; // ISO
}

export interface Game {
  id: string;
  sport: Sport;
  title: string;
  place: string;
  distanceMi: number;
  startsAt: string; // ISO
  maxPlayers: number;
  skill: SkillLevel;
  minAge: number; // 0 = all ages
  teamsEnabled: boolean;
  creatorId?: string;
  participants: Participant[];
  messages: ChatMessage[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  city?: string;
}

// Sport accent colors come straight from the four-color bar in the logo.
export const SPORTS: { id: Sport; label: string; color: string }[] = [
  { id: 'basketball', label: 'Basketball', color: '#f5a623' },
  { id: 'soccer', label: 'Soccer', color: '#17a34a' },
  { id: 'baseball', label: 'Baseball', color: '#1d4ed8' },
  { id: 'flag-football', label: 'Flag football', color: '#d92d3a' },
];

export const SKILLS: { id: SkillLevel; label: string; blurb: string; color: string }[] = [
  { id: 'casual', label: 'Casual', blurb: 'For fun. New players welcome.', color: '#2f9e6a' },
  { id: 'intermediate', label: 'Intermediate', blurb: 'Plays regularly. Friendly but competitive.', color: '#3f6bd6' },
  { id: 'competitive', label: 'Competitive', blurb: 'Fast and skilled. Come ready to run.', color: '#d9822b' },
  { id: 'all', label: 'All levels', blurb: 'Any skill level. Everyone welcome.', color: '#98a49b' },
];

export const AGE_PRESETS = [0, 18, 35, 45];

// The two sides, colored with the blue and red from the logo.
export const TEAMS: { id: TeamId; label: string; color: string }[] = [
  { id: 'a', label: 'Team A', color: '#1d4ed8' },
  { id: 'b', label: 'Team B', color: '#d92d3a' },
];

export function skillMeta(id: SkillLevel) {
  return SKILLS.find((s) => s.id === id)!;
}

export function sportMeta(id: Sport) {
  return SPORTS.find((s) => s.id === id)!;
}

export function ageLabel(minAge: number) {
  return minAge > 0 ? `${minAge}+` : 'All ages';
}
