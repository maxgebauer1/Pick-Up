import React from 'react';
import { Player } from '../types';

// Memoized: rendered in bulk (up to 3 per card × N cards, plus rosters), it's
// the multiplier behind list re-renders, so skipping equal-prop re-renders
// compounds the GameCard/PlayerRow memo wins.
export const Avatar = React.memo(function Avatar({
  player,
  size = 40,
  ring = false,
}: {
  player: Player;
  size?: number;
  ring?: boolean;
}) {
  return (
  <span
    className="inline-flex items-center justify-center rounded-pill text-white font-extrabold shrink-0"
    style={{
      background: player.color,
      width: size,
      height: size,
      fontSize: size * 0.36,
      border: ring ? '2px solid #fff' : undefined,
    }}
    aria-hidden="true"
  >
    {player.initials}
  </span>
  );
});
