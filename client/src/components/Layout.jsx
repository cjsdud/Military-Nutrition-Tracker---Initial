import { NavLink, Outlet } from 'react-router-dom';

const NAV = {
  admin: [
    { to: '/meals', label: '부대 식단', icon: '🍱' },
    { to: '/stats', label: '통계', icon: '📊' },
  ],
  soldier: [
    { to: '/me', label: '내 영양', icon: '🪖' },
  ],
};

export default function Layout({ session, logout }) {
  const nav = NAV[session.role] || [];
  const who = session.role === 'admin'
    ? '관리자'
    : `${session.soldierRank || ''} ${session.soldierName || ''}`.trim();

  return (
    <div className="min-h-full pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 bg-brand text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">🍽️ {session.unitName}</h1>
            <p className="text-xs text-white/80">{who}</p>
          </div>
          <div className="flex items-center gap-1">
            <nav className="hidden gap-1 sm:flex">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                  {n.icon} {n.label}
                </NavLink>
              ))}
            </nav>
            <button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet context={{ session }} />
      </main>

      {nav.length > 1 && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-gray-200 bg-white sm:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'text-brand font-semibold' : 'text-gray-500'}`}>
              <span className="text-lg">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
