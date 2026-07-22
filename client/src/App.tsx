import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import GameLobby from './components/GameLobby';
import CreateGame from './components/CreateGame';
import Profile from './components/Profile';
import Friends from './components/Friends';
import FindSimilarFriends from './components/FindSimilarFriends';
import Leaderboard from './components/Leaderboard';
import Navbar from './components/Navbar';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-app">
          <Navbar />
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/" 
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/create-game" 
                element={
                  <PrivateRoute>
                    <CreateGame />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/game/:gameId" 
                element={
                  <PrivateRoute>
                    <GameLobby />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/friends" 
                element={
                  <PrivateRoute>
                    <Friends />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/find-friends" 
                element={
                  <PrivateRoute>
                    <FindSimilarFriends />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="/leaderboard" 
                element={
                  <PrivateRoute>
                    <Leaderboard />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App; 