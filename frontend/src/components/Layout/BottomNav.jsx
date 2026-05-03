import {
  BookMarked,
  BookOpen,
  Compass,
  Heart,
  History,
  LayoutDashboard,
  MessageSquare,
  Notebook,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/cn';
import { haptic } from '../../lib/telegram';

const studentTabs = [
  { to: '/library', label: 'Кітапхана', icon: Compass },
  { to: '/favourites', label: 'Таңдаулы', icon: Heart },
  { to: '/history', label: 'Тарих', icon: History },
];

const authorTabs = [
  { to: '/author/dashboard', label: 'Шолу', icon: LayoutDashboard },
  { to: '/author/lessons', label: 'Жобалар', icon: Notebook },
  { to: '/author/broadcast', label: 'Хабар', icon: MessageSquare },
];

export function BottomNav({ role }) {
  const tabs = role === 'author' ? authorTabs : studentTabs;
  return (
    <nav
      className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-border bg-bg/85 backdrop-blur-md"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={() => haptic('select')}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-2.5 transition',
                  isActive ? 'text-ink' : 'text-ink-faint',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full transition',
                      isActive
                        ? 'bg-primary/20 text-primary-soft'
                        : 'text-current',
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-ticker">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
