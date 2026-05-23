import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import UnitMeals from './pages/UnitMeals';
import SoldierTracker from './pages/SoldierTracker';
import Stats from './pages/Stats';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/meals" replace />} />
        <Route path="/meals" element={<UnitMeals />} />
        <Route path="/soldiers" element={<SoldierTracker />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="*" element={<Navigate to="/meals" replace />} />
      </Route>
    </Routes>
  );
}
