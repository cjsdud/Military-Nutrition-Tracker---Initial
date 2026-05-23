import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/meals', label: '부대 식단', icon: '🍱' },
  { to: '/soldiers', label: '병사 추적', icon: '🪖' },
  { to: '/stats', label: '통계', icon: '📊' },
];

export default function Layout() {
  return (
    <div className="min-h-full pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 bg-brand text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-base font-bold sm:text-lg">🍽️ 군부대 식단 영양가 추적</h1>
          <nav className="hidden gap-1 sm:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                {n.icon} {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 border-t border-gray-200 bg-white sm:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand font-semibold' : 'text-gray-500'}`}>
            <span className="text-lg">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
