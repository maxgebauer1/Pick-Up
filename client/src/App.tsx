import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './data/store';
import { BottomNav } from './components/BottomNav';
import { Browse } from './screens/Browse';
import { GameDetail } from './screens/GameDetail';
import { CreateGame } from './screens/CreateGame';
import { Profile } from './screens/Profile';
import { Login } from './screens/Login';

// Bottom nav shows on the main tabs, hides on full-screen flows (detail, create).
const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/game/') || pathname.startsWith('/create');

  return (
    <>
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/create" element={<CreateGame />} />
        <Route path="/game/:gameId" element={<GameDetail />} />
        <Route path="/me" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
};

const Gate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Loading…</div>;
  }
  if (!user) return <Login />;

  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <Router>
      <Gate />
    </Router>
  </AuthProvider>
);

export default App;
