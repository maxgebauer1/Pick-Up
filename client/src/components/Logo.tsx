import React from 'react';

// The four-color bar from the Pick Up Sports mark.
const BAR = ['#1d4ed8', '#d92d3a', '#f5a623', '#17a34a'];

// The PU mark: dark rounded square, white "PU", four-color bar underneath.
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 72, className }) => (
  <span
    className={className}
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.2),
      background: '#14181c',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: size * 0.13,
      boxSizing: 'border-box',
    }}
  >
    <span
      style={{
        color: '#fff',
        fontWeight: 800,
        fontStyle: 'italic',
        fontSize: size * 0.42,
        lineHeight: 1,
        letterSpacing: '-0.04em',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      PU
    </span>
    <span style={{ display: 'flex', gap: size * 0.03, width: '100%' }}>
      {BAR.map((c) => (
        <span key={c} style={{ flex: 1, height: Math.max(2, size * 0.045), background: c, borderRadius: 999 }} />
      ))}
    </span>
  </span>
);
