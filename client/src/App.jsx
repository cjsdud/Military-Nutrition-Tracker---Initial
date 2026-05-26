import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import UnitMeals from './pages/UnitMeals';
import SoldierTracker from './pages/SoldierTracker';
import Stats from './pages/Stats';
import { getSession, saveSession, clearSession } from './lib/session';

export default function App() {
  const [session, setSession] = useState(getSession());

  const login = (s) => { saveSession(s); setSession(s); };
  const logout = () => { clearSession(); setSession(null); };

  if (!session) return <Login onLogin={login} />;

  const isAdmin = session.role === 'admin';

  return (
    <Routes>
      <Route element={<Layout session={session} logout={logout} />}>
        {isAdmin ? (
          <>
            <Route index element={<Navigate to="/meals" replace />} />
            <Route path="/meals" element={<UnitMeals />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="*" element={<Navigate to="/meals" replace />} />
          </>
        ) : (
          <>
            <Route index element={<Navigate to="/me" replace />} />
            <Route path="/me" element={<SoldierTracker />} />
            <Route path="*" element={<Navigate to="/me" replace />} />
          </>
        )}
      </Route>
    </Routes>
  );
}
