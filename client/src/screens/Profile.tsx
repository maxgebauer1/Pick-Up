import React, { useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useStore, myParticipant } from '../data/store';
import { Avatar } from '../components/Avatar';
import { GameCard } from '../components/GameCard';

export const Profile: React.FC = () => {
  const { games, currentUser } = useStore();
  const [pushOn, setPushOn] = useState(true);

  const myGames = games
    .filter((g) => myParticipant(g))
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div className="mx-auto max-w-md px-4 pt-8 pb-28">
      <div className="flex flex-col items-center text-center">
        <Avatar player={currentUser} size={76} />
        <h1 className="text-[22px] font-extrabold mt-3">{currentUser.name}</h1>
        <p className="text-[13px] text-muted mt-0.5">Venice, CA</p>
      </div>

      {/* notifications */}
      <div className="card mt-7 p-4">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-pill bg-green-soft flex items-center justify-center">
            <Bell size={17} className="text-green" />
          </span>
          <div className="flex-1">
            <p className="text-[14px] font-extrabold">Game reminders</p>
            <p className="text-[12.5px] text-muted">Get a nudge to confirm before each game.</p>
          </div>
          <button
            onClick={() => setPushOn((v) => !v)}
            className={`w-12 h-7 rounded-pill p-0.5 transition-colors ${pushOn ? 'bg-green' : 'bg-line'}`}
            aria-label="Toggle reminders"
          >
            <span
              className="block w-6 h-6 rounded-pill bg-white transition-transform"
              style={{ transform: pushOn ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-line text-[13px]">
          <span className="text-muted font-semibold">Text me reminders too</span>
          <span className="flex items-center gap-1 text-faint font-bold">Coming soon <ChevronRight size={14} /></span>
        </div>
      </div>

      {/* my games */}
      <h2 className="text-[13px] font-extrabold mt-7 mb-3">Your games</h2>
      {myGames.length === 0 ? (
        <p className="text-[14px] text-muted text-center py-10">
          You haven't joined a game yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {myGames.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  );
};
