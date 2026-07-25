import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Type, Minus, Plus } from 'lucide-react';
import { useStore } from '../data/store';
import { SportIcon } from '../icons/Sports';
import { Sport, SkillLevel, SPORTS, SKILLS, AGE_PRESETS, ageLabel } from '../types';

// default: tomorrow at 9:00am, formatted for <input type="datetime-local">
function defaultWhen(): string {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const Label: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <p className="text-[13px] font-extrabold mb-2.5 flex items-center gap-2">
    {children}
    {hint && <span className="text-faint font-semibold text-[12px]">· {hint}</span>}
  </p>
);

export const CreateGame: React.FC = () => {
  const nav = useNavigate();
  const { createGame } = useStore();

  const [sport, setSport] = useState<Sport>('basketball');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [when, setWhen] = useState(defaultWhen());
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [skill, setSkill] = useState<SkillLevel>('intermediate');
  const [minAge, setMinAge] = useState(0);

  const canCreate = title.trim() && place.trim() && when;

  const create = () => {
    if (!canCreate) return;
    const id = createGame({
      sport,
      title: title.trim(),
      place: place.trim(),
      distanceMi: 0,
      startsAt: new Date(when).toISOString(),
      maxPlayers,
      skill,
      minAge,
    });
    nav(`/game/${id}`);
  };

  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col">
      <div className="sticky top-0 z-20 bg-bg/90 backdrop-blur flex items-center justify-between px-3 py-3">
        <button className="w-9 h-9 rounded-pill bg-surface border border-line flex items-center justify-center" onClick={() => nav('/')}>
          <X size={18} />
        </button>
        <span className="text-[14px] font-extrabold">New game</span>
        <span className="w-9" />
      </div>

      <div className="px-4 pb-40 flex-1">
        {/* sport */}
        <div className="mt-1">
          <Label>Sport</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {SPORTS.map((s) => {
              const on = sport === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSport(s.id)}
                  className={`flex items-center gap-2.5 rounded-field px-3 py-3 text-[13.5px] font-bold border transition-colors ${
                    on ? 'border-green bg-green-soft text-green-deep' : 'border-line bg-surface text-ink'
                  }`}
                  style={{ borderWidth: 1.5 }}
                >
                  <SportIcon sport={s.id} size={18} className={on ? 'text-green' : 'text-muted'} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* title */}
        <div className="mt-5">
          <Label>Title</Label>
          <div className="flex items-center gap-2.5 border border-line rounded-field px-3.5 py-3 bg-surface" style={{ borderWidth: 1.5 }}>
            <Type size={16} className="text-faint shrink-0" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Saturday Morning Run"
              className="flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-faint placeholder:font-normal"
            />
          </div>
        </div>

        {/* place */}
        <div className="mt-5">
          <Label>Where</Label>
          <div className="flex items-center gap-2.5 border border-line rounded-field px-3.5 py-3 bg-surface" style={{ borderWidth: 1.5 }}>
            <MapPin size={16} className="text-faint shrink-0" />
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Court, field or park"
              className="flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-faint placeholder:font-normal"
            />
          </div>
        </div>

        {/* when & size */}
        <div className="mt-5">
          <Label>When &amp; size</Label>
          <div className="flex gap-2.5">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="flex-1 border border-line rounded-field px-3 py-3 bg-surface text-[13.5px] font-semibold outline-none"
              style={{ borderWidth: 1.5 }}
            />
            <div className="flex items-center gap-1 border border-line rounded-field px-1.5 py-1.5 bg-surface" style={{ borderWidth: 1.5 }}>
              <button
                onClick={() => setMaxPlayers((n) => Math.max(2, n - 1))}
                className="w-8 h-8 rounded-[9px] border border-line bg-bg text-lg font-bold flex items-center justify-center"
                aria-label="Fewer players"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-[16px] font-extrabold tabular-nums">{maxPlayers}</span>
              <button
                onClick={() => setMaxPlayers((n) => Math.min(30, n + 1))}
                className="w-8 h-8 rounded-[9px] border border-line bg-bg text-lg font-bold flex items-center justify-center"
                aria-label="More players"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* skill */}
        <div className="mt-5">
          <Label hint="who it's for">Skill level</Label>
          <div className="flex flex-col gap-2">
            {SKILLS.filter((s) => s.id !== 'all').map((s) => {
              const on = skill === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSkill(s.id)}
                  className={`flex gap-3 items-start text-left rounded-field px-3.5 py-3 border transition-colors ${
                    on ? 'border-green bg-green-soft' : 'border-line bg-surface'
                  }`}
                  style={{ borderWidth: 1.5 }}
                >
                  <span
                    className="w-[18px] h-[18px] rounded-pill border-2 shrink-0 mt-0.5 flex items-center justify-center"
                    style={{ borderColor: on ? '#1f7a4d' : '#e4eae4' }}
                  >
                    {on && <span className="w-2.5 h-2.5 rounded-pill bg-green" />}
                  </span>
                  <span>
                    <span className="flex items-center gap-2 text-[14px] font-extrabold">
                      <span className="w-2 h-2 rounded-pill" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="block text-[12.5px] text-muted mt-0.5">{s.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* min age */}
        <div className="mt-5">
          <Label hint="optional">Minimum age</Label>
          <div className="flex flex-wrap gap-2">
            {AGE_PRESETS.map((a) => (
              <button
                key={a}
                onClick={() => setMinAge(a)}
                className={`text-[13px] font-bold rounded-pill px-4 py-2 border transition-colors ${
                  minAge === a ? 'border-green bg-green-soft text-green-deep' : 'border-line bg-surface text-muted'
                }`}
                style={{ borderWidth: 1.5 }}
              >
                {ageLabel(a)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line">
        <div className="mx-auto max-w-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button className="btn-primary" disabled={!canCreate} onClick={create}>
            Create game
          </button>
        </div>
      </div>
    </div>
  );
};
