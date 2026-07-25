import React from 'react';
import { NavLink } from 'react-router-dom';
import { Search, Plus, User } from 'lucide-react';

const items = [
  { to: '/', label: 'Browse', Icon: Search, end: true },
  { to: '/create', label: 'Create', Icon: Plus, end: false },
  { to: '/me', label: 'Me', Icon: User, end: false },
];

export const BottomNav: React.FC = () => (
  <nav className="fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line">
    <div className="mx-auto max-w-md flex justify-around items-center px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-5 py-1 text-[11px] font-bold transition-colors ${
              isActive ? 'text-green' : 'text-faint'
            }`
          }
        >
          <Icon size={22} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
);
