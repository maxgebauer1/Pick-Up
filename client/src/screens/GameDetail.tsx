import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Check, Send } from 'lucide-react';
import {
  useStore,
  gamePhase,
  activeCount,
  confirmedCount,
  spotsLeft,
  isFull,
  myParticipant,
} from '../data/store';
import { SportIcon } from '../icons/Sports';
import { Avatar } from '../components/Avatar';
import { skillMeta, ageLabel, Participant, AttendanceStatus } from '../types';
import { startLabel, startsInLabel, timeAgo } from '../lib/format';

const StatusPill: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
  if (status === 'confirmed' || status === 'checked-in') {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-green-deep bg-green-soft px-2.5 py-1 rounded-pill">
        <Check size={12} strokeWidth={3} />
        {status === 'checked-in' ? 'Here' : 'Confirmed'}
      </span>
    );
  }
  if (status === 'waitlisted') {
    return (
      <span className="text-[11.5px] font-extrabold text-muted bg-bg px-2.5 py-1 rounded-pill">
        Waiting
      </span>
    );
  }
  return (
    <span className="text-[11.5px] font-extrabold text-amber bg-amber-soft px-2.5 py-1 rounded-pill">
      Pending
    </span>
  );
};

export const GameDetail: React.FC = () => {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { getGame, join, leave, setMyStatus, sendMessage } = useStore();
  const [draft, setDraft] = useState('');

  const game = gameId ? getGame(gameId) : undefined;
  if (!game) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center text-muted">
        Game not found.
        <div className="mt-4">
          <button className="btn-secondary" onClick={() => nav('/')}>Back to browse</button>
        </div>
      </div>
    );
  }

  const skill = skillMeta(game.skill);
  const phase = gamePhase(game);
  const me = myParticipant(game);
  const full = isFull(game);
  const spots = spotsLeft(game);

  const active = game.participants.filter((p) => p.status !== 'waitlisted');
  const waitlist = game.participants.filter((p) => p.status === 'waitlisted');

  const showConfirmBanner = me && me.status === 'joined' && phase === 'confirm';
  const showCheckIn = me && (me.status === 'joined' || me.status === 'confirmed') && phase === 'live';

  const playersHeading =
    phase === 'upcoming'
      ? `${activeCount(game)} of ${game.maxPlayers} going`
      : `${confirmedCount(game)} of ${activeCount(game)} confirmed`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(game.id, draft);
    setDraft('');
  };

  return (
    <div className="mx-auto max-w-md min-h-screen flex flex-col">
      {/* top bar */}
      <div className="sticky top-0 z-20 bg-bg/90 backdrop-blur flex items-center justify-between px-3 py-3">
        <button className="w-9 h-9 rounded-pill bg-surface border border-line flex items-center justify-center" onClick={() => nav(-1)}>
          <ChevronLeft size={18} />
        </button>
        <span className="text-[14px] font-extrabold">Game</span>
        <span className="w-9" />
      </div>

      <div className="px-4 pb-40 flex-1">
        <span className="pill-green">
          <SportIcon sport={game.sport} size={14} />
          <span className="capitalize">{game.sport.replace('-', ' ')}</span>
          <span className="opacity-60">·</span>
          {startLabel(game.startsAt)}
        </span>

        <h1 className="text-[23px] font-extrabold mt-3">{game.title}</h1>
        <p className="flex items-center gap-1.5 text-[14px] text-muted mt-1">
          <MapPin size={15} className="text-faint" />
          {game.place} · {game.distanceMi.toFixed(1)} mi away
        </p>

        {/* meta chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-bold border border-line rounded-field px-3 py-2 bg-surface">
            <span className="w-2 h-2 rounded-pill" style={{ background: skill.color }} />
            {skill.label}
          </span>
          <span className="inline-flex items-center text-[12.5px] font-bold border border-line rounded-field px-3 py-2 bg-surface">
            {ageLabel(game.minAge)}
          </span>
          <span
            className={`inline-flex items-center text-[12.5px] font-bold rounded-field px-3 py-2 ${
              full ? 'text-[#a23b34] bg-[#fbe9e7]' : 'text-green-deep bg-green-soft'
            }`}
          >
            {full ? 'Full' : `${spots} spots left`}
          </span>
        </div>

        {/* confirm banner */}
        {showConfirmBanner && (
          <div className="bg-amber-soft rounded-card p-4 mt-5">
            <div className="flex items-center gap-2 text-[15px] font-extrabold text-amber">
              <Clock size={17} strokeWidth={2.4} />
              {startsInLabel(game.startsAt)}
            </div>
            <p className="text-[13px] text-muted mt-1 mb-3">
              Confirm you're coming so we hold your spot. Unconfirmed spots open to the waitlist soon.
            </p>
            <div className="flex gap-2.5">
              <button className="btn-primary flex-1" onClick={() => setMyStatus(game.id, 'confirmed')}>
                Yes, I'm coming
              </button>
              <button className="btn-secondary w-auto px-4" onClick={() => leave(game.id)}>
                Can't make it
              </button>
            </div>
          </div>
        )}

        {/* check-in banner */}
        {showCheckIn && (
          <div className="bg-green-soft rounded-card p-4 mt-5">
            <div className="flex items-center gap-2 text-[15px] font-extrabold text-green-deep">
              <MapPin size={17} strokeWidth={2.4} />
              Game time — you here?
            </div>
            <p className="text-[13px] text-muted mt-1 mb-3">
              Check in so the host knows you made it.
            </p>
            <button className="btn-primary" onClick={() => setMyStatus(game.id, 'checked-in')}>
              I'm here
            </button>
          </div>
        )}

        {me?.status === 'checked-in' && (
          <div className="flex items-center gap-2 mt-5 text-[14px] font-bold text-green-deep bg-green-soft rounded-card px-4 py-3">
            <Check size={17} strokeWidth={3} /> You're checked in — have a good game!
          </div>
        )}

        {/* players */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-extrabold">Players</h2>
            <span className="text-[13px] text-faint font-semibold">{playersHeading}</span>
          </div>
          <div className="flex flex-col">
            {active.map((p) => (
              <PlayerRow key={p.player.id} p={p} showStatus={phase !== 'upcoming'} />
            ))}
          </div>

          {waitlist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dashed border-line">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-extrabold">Waitlist</h2>
                <span className="text-[13px] text-faint font-semibold">{waitlist.length} waiting</span>
              </div>
              {waitlist.map((p, i) => (
                <PlayerRow key={p.player.id} p={p} showStatus nextUp={i === 0} />
              ))}
            </div>
          )}
        </section>

        {/* chat */}
        <section className="mt-6">
          <h2 className="text-[13px] font-extrabold mb-3">Lobby chat</h2>
          <div className="bg-bg rounded-card p-3">
            {game.messages.length === 0 && (
              <p className="text-[13px] text-faint text-center py-4">
                No messages yet — say hi 👋
              </p>
            )}
            {game.messages.map((m) => {
              const mine = m.player.id === 'me';
              return (
                <div key={m.id} className={`flex gap-2 mb-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Avatar player={m.player} size={26} />
                  <div className={mine ? 'text-right' : ''}>
                    <div className="text-[11px] font-extrabold text-muted">
                      {mine ? 'You' : m.player.name} <span className="text-faint font-medium">· {timeAgo(m.at)}</span>
                    </div>
                    <div
                      className={`text-[13px] inline-block px-3 py-2 mt-0.5 border ${
                        mine
                          ? 'bg-green text-white border-transparent rounded-[12px_0_12px_12px]'
                          : 'bg-surface border-line rounded-[0_12px_12px_12px]'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <form onSubmit={submit} className="flex items-center gap-2 bg-surface border border-line rounded-pill py-1.5 pl-4 pr-1.5 mt-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the group…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                className="w-8 h-8 rounded-pill bg-green flex items-center justify-center shrink-0 disabled:opacity-40"
                disabled={!draft.trim()}
                aria-label="Send"
              >
                <Send size={15} className="text-white" />
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line">
        <div className="mx-auto max-w-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!me && (
            <button className="btn-primary" onClick={() => join(game.id)}>
              {full ? 'Join waitlist' : 'Join game'}
            </button>
          )}
          {me?.status === 'waitlisted' && (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[14px] font-bold text-muted">You're on the waitlist</span>
              <button className="btn-secondary w-auto px-5" onClick={() => leave(game.id)}>Leave</button>
            </div>
          )}
          {me && me.status !== 'waitlisted' && (
            <div className="flex items-center gap-3">
              <span className="flex-1 text-[14px] font-bold text-green-deep flex items-center gap-1.5">
                <Check size={16} strokeWidth={3} />
                {me.status === 'confirmed' ? "You're confirmed" : me.status === 'checked-in' ? "You're here" : "You're in"}
              </span>
              <button className="btn-secondary w-auto px-5" onClick={() => leave(game.id)}>Leave</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerRow: React.FC<{ p: Participant; showStatus?: boolean; nextUp?: boolean }> = ({
  p,
  showStatus,
  nextUp,
}) => (
  <div className="flex items-center gap-3 py-2">
    <Avatar player={p.player} size={36} />
    <span className="flex-1 text-[14px] font-bold">
      {p.player.id === 'me' ? 'You' : p.player.name}
      {p.isHost && <span className="text-faint font-semibold text-[12px]"> · host</span>}
    </span>
    {nextUp ? (
      <span className="text-[11.5px] font-extrabold text-amber bg-amber-soft px-2.5 py-1 rounded-pill">Next up</span>
    ) : (
      showStatus && <StatusPill status={p.status} />
    )}
  </div>
);
