import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useStore } from '../data/store';
import { GameCard } from '../components/GameCard';
import { Sport, SkillLevel, SPORTS } from '../types';

type SportFilter = Sport | 'all';

export const Browse: React.FC = () => {
  const { games } = useStore();
  const [sport, setSport] = useState<SportFilter>('all');
  const [skill, setSkill] = useState<SkillLevel | 'all'>('all');

  const visible = games
    .filter((g) => (sport === 'all' ? true : g.sport === sport))
    .filter((g) => (skill === 'all' ? true : g.skill === skill || g.skill === 'all'))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div className="mx-auto max-w-md px-4 pt-5 pb-28">
      <header className="mb-3">
        <h1 className="text-[26px] font-extrabold">Games near you</h1>
        <p className="flex items-center gap-1.5 text-[13px] text-muted mt-1">
          <MapPin size={14} className="text-faint" />
          Venice, CA · within 5 mi
        </p>
      </header>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        <button className={`chip ${sport === 'all' ? 'chip-active' : ''}`} onClick={() => setSport('all')}>
          All sports
        </button>
        {SPORTS.map((s) => (
          <button
            key={s.id}
            className={`chip ${sport === s.id ? 'chip-active' : ''}`}
            onClick={() => setSport(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Skill filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mt-2 pb-1">
        {(['all', 'casual', 'intermediate', 'competitive'] as const).map((lvl) => (
          <button
            key={lvl}
            className={`chip capitalize ${skill === lvl ? 'chip-active' : ''}`}
            onClick={() => setSkill(lvl)}
          >
            {lvl === 'all' ? 'Any level' : lvl}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-3 mt-4">
        {visible.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {visible.length === 0 && (
          <div className="text-center text-muted text-sm py-16">
            No games match those filters yet.
            <br />
            Be the first — tap <span className="font-bold text-green">Create</span>.
          </div>
        )}
      </div>
    </div>
  );
};
