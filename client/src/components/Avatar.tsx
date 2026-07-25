import React from 'react';
import { Player } from '../types';

export const Avatar: React.FC<{ player: Player; size?: number; ring?: boolean }> = ({
  player,
  size = 40,
  ring = false,
}) => (
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
