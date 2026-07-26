import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Game, skillMeta, sportMeta, ageLabel } from '../types';
import { SportIcon } from '../icons/Sports';
import { Avatar } from './Avatar';
import { startLabel } from '../lib/format';

// Memoized so a filter tap in Browse (which changes no game data) doesn't
// re-render every card and its Avatars/SportIcon; the store preserves game
// object references for unchanged games, so unaffected cards skip re-render.
export const GameCard = React.memo(function GameCard({ game }: { game: Game }) {
  const nav = useNavigate();
  const skill = skillMeta(game.skill);
  const sport = sportMeta(game.sport);
  // Derive every count from a single participants scan instead of the composed
  // store helpers (isFull -> spotsLeft -> activeCount), which each re-scan.
  const active = game.participants.filter((p) => p.status !== 'waitlisted');
  const spots = Math.max(0, game.maxPlayers - active.length);
  const full = spots === 0;
  const shown = active.slice(0, 3);
  const extra = active.length - shown.length;

  return (
    <button
      onClick={() => nav(`/game/${game.id}`)}
      className="card w-full text-left p-4 active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-pill"
          style={{ color: sport.color, background: `${sport.color}1f` }}
        >
          <SportIcon sport={game.sport} size={14} />
          <span className="capitalize">{game.sport.replace('-', ' ')}</span>
        </span>
        <span className="text-[13px] text-muted font-medium tabular-nums">{startLabel(game.startsAt)}</span>
      </div>

      <h3 className="text-[16px] font-extrabold mt-2.5">{game.title}</h3>
      <p className="text-[13.5px] text-muted mt-0.5">
        {game.place} · {game.distanceMi.toFixed(1)} mi away
      </p>

      <div className="flex items-center gap-2 mt-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted">
          <span className="w-2 h-2 rounded-pill" style={{ background: skill.color }} />
          {skill.label}
        </span>
        <span className="text-faint">·</span>
        <span className="text-[12px] font-semibold text-muted">{ageLabel(game.minAge)}</span>
      </div>

      <div className="flex items-center justify-between mt-3.5">
        <div className="flex">
          {shown.map((p, i) => (
            <span key={p.player.id} style={{ marginLeft: i === 0 ? 0 : -9 }}>
              <Avatar player={p.player} size={27} ring />
            </span>
          ))}
          {extra > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-pill text-white font-bold bg-faint"
              style={{ width: 27, height: 27, fontSize: 10, marginLeft: -9, border: '2px solid #fff' }}
            >
              +{extra}
            </span>
          )}
        </div>
        <span
          className={`text-[12.5px] font-bold px-3 py-1.5 rounded-pill ${
            full ? 'text-[#a23b34] bg-[#fbe9e7]' : 'text-green-deep bg-green-soft'
          }`}
        >
          {full ? 'Full' : `${spots} ${spots === 1 ? 'spot' : 'spots'} left`}
        </span>
      </div>
    </button>
  );
});
