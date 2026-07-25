export type Sport = 'basketball' | 'soccer' | 'baseball' | 'flag-football';

export type SkillLevel = 'casual' | 'intermediate' | 'competitive' | 'all';

// A player's relationship to a game as it moves through the show-up loop.
export type AttendanceStatus = 'joined' | 'confirmed' | 'checked-in' | 'waitlisted';

export interface Player {
  id: string;
  name: string;
  initials: string;
  color: string; // avatar background
}

export interface Participant {
  player: Player;
  status: AttendanceStatus;
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

export const SPORTS: { id: Sport; label: string }[] = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'baseball', label: 'Baseball' },
  { id: 'flag-football', label: 'Flag football' },
];

export const SKILLS: { id: SkillLevel; label: string; blurb: string; color: string }[] = [
  { id: 'casual', label: 'Casual', blurb: 'Just for fun — new players welcome.', color: '#2f9e6a' },
  { id: 'intermediate', label: 'Intermediate', blurb: 'Plays regularly, friendly but competitive.', color: '#3f6bd6' },
  { id: 'competitive', label: 'Competitive', blurb: 'Fast and skilled — experience expected.', color: '#d9822b' },
  { id: 'all', label: 'All levels', blurb: "Mixed abilities, everyone's welcome.", color: '#98a49b' },
];

export const AGE_PRESETS = [0, 16, 18, 21];

export function skillMeta(id: SkillLevel) {
  return SKILLS.find((s) => s.id === id)!;
}

export function ageLabel(minAge: number) {
  return minAge > 0 ? `${minAge}+` : 'All ages';
}
