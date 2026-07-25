import React from 'react';
import { Sport } from '../types';

type Props = { className?: string; size?: number };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
});

export const BasketballIcon: React.FC<Props> = ({ className, size = 20 }) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8" />
  </svg>
);

export const SoccerIcon: React.FC<Props> = ({ className, size = 20 }) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5l4 3-1.5 4.7h-5L8 10.5z" />
    <path d="M12 3v4.5M4.2 9.5l3.8 1M19.8 9.5l-3.8 1M7 20l1.5-4.4M17 20l-1.5-4.4" />
  </svg>
);

export const BaseballIcon: React.FC<Props> = ({ className, size = 20 }) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M6.5 4.5C8 7 8.4 9.5 8 12s-1.5 4.8-3 6.9M17.5 4.5C16 7 15.6 9.5 16 12s1.5 4.8 3 6.9" />
  </svg>
);

export const FootballIcon: React.FC<Props> = ({ className, size = 20 }) => (
  <svg {...base(size, className)}>
    <path d="M4 12c0-4 4-8 8-8s8 4 8 8-4 8-8 8-8-4-8-8z" />
    <path d="M9 12h6M12 9.5v5M6 8.5c2 1.5 2 5.5 0 7M18 8.5c-2 1.5-2 5.5 0 7" />
  </svg>
);

export const SportIcon: React.FC<Props & { sport: Sport }> = ({ sport, ...rest }) => {
  switch (sport) {
    case 'basketball':
      return <BasketballIcon {...rest} />;
    case 'soccer':
      return <SoccerIcon {...rest} />;
    case 'baseball':
      return <BaseballIcon {...rest} />;
    case 'flag-football':
      return <FootballIcon {...rest} />;
  }
};
