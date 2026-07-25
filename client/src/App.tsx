import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { StoreProvider } from './data/store';
import { BottomNav } from './components/BottomNav';
import { Browse } from './screens/Browse';
import { GameDetail } from './screens/GameDetail';
import { CreateGame } from './screens/CreateGame';
import { Profile } from './screens/Profile';

// Bottom nav shows on the main tabs, hides on full-screen flows (detail, create).
const Shell: React.FC = () => {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/game/') || pathname.startsWith('/create');

  return (
    <>
      <Routes>
        <Route path="/" element={<Browse />} />
        <Route path="/create" element={<CreateGame />} />
        <Route path="/game/:gameId" element={<GameDetail />} />
        <Route path="/me" element={<Profile />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  );
};

const App: React.FC = () => (
  <StoreProvider>
    <Router>
      <Shell />
    </Router>
  </StoreProvider>
);

export default App;
