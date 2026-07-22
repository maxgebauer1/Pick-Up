import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Plus, Settings, Users, Search, Trophy, Menu, X } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-surface border-b border-border-subtle sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-accent-primary rounded-card flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(0, 240, 255, 0.3)' }}>
                <span className="text-app font-bold text-base sm:text-lg">P</span>
              </div>
              <span className="ml-2 sm:ml-3 text-base sm:text-heading-3 text-text-primary font-bold hidden sm:inline">Pick Up</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {user ? (
              <>
                <Link
                  to="/create-game"
                  className="btn-primary inline-flex items-center text-caption px-3 lg:px-4 py-1.5 lg:py-2"
                >
                  <Plus className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden lg:inline">Create</span>
                </Link>
                <Link
                  to="/friends"
                  className="flex items-center text-text-secondary hover:text-text-primary p-2 rounded-card transition-all duration-150"
                  title="Friends"
                >
                  <Users className="w-4 h-4" />
                </Link>
                <Link
                  to="/find-friends"
                  className="flex items-center text-text-secondary hover:text-text-primary p-2 rounded-card transition-all duration-150"
                  title="Find Friends"
                >
                  <Search className="w-4 h-4" />
                </Link>
                <Link
                  to="/leaderboard"
                  className="flex items-center text-text-secondary hover:text-text-primary p-2 rounded-card transition-all duration-150"
                  title="Leaderboard"
                >
                  <Trophy className="w-4 h-4" />
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center text-text-secondary hover:text-text-primary p-2 rounded-card transition-all duration-150"
                  title="Profile"
                >
                  <Settings className="w-4 h-4" />
                </Link>
                <div className="flex items-center px-2 lg:px-3 py-2">
                  <User className="w-4 h-4 text-text-muted mr-1 lg:mr-2" />
                  <span className="text-caption text-text-secondary hidden lg:inline max-w-[100px] truncate">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-caption px-3 lg:px-4 py-1.5 lg:py-2"
                >
                  <LogOut className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2 lg:space-x-3">
                <Link
                  to="/login"
                  className="text-text-secondary hover:text-text-primary px-2 lg:px-3 py-2 rounded-card text-caption font-medium transition-all duration-150"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-caption px-3 lg:px-4 py-1.5 lg:py-2"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          {user && (
            <div className="md:hidden flex items-center space-x-1">
              <Link
                to="/create-game"
                className="btn-primary inline-flex items-center text-caption px-2.5 py-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Plus className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          )}

          {/* Mobile Menu (for non-logged in users) */}
          {!user && (
            <div className="md:hidden flex items-center space-x-2">
              <Link
                to="/login"
                className="text-text-secondary hover:text-text-primary px-2 py-1.5 rounded-card text-caption font-medium transition-all duration-150"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="btn-primary text-caption px-3 py-1.5"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Dropdown Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t border-border-subtle bg-surface">
            <div className="px-3 py-3 space-y-1">
              <Link
                to="/friends"
                className="flex items-center space-x-3 text-text-secondary hover:text-text-primary px-3 py-2.5 rounded-card transition-all duration-150"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-5 h-5" />
                <span className="text-body">Friends</span>
              </Link>
              <Link
                to="/find-friends"
                className="flex items-center space-x-3 text-text-secondary hover:text-text-primary px-3 py-2.5 rounded-card transition-all duration-150"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search className="w-5 h-5" />
                <span className="text-body">Find Friends</span>
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center space-x-3 text-text-secondary hover:text-text-primary px-3 py-2.5 rounded-card transition-all duration-150"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Trophy className="w-5 h-5" />
                <span className="text-body">Leaderboard</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center space-x-3 text-text-secondary hover:text-text-primary px-3 py-2.5 rounded-card transition-all duration-150"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-5 h-5" />
                <span className="text-body">Profile</span>
              </Link>
              <div className="flex items-center space-x-3 px-3 py-2.5 border-t border-border-subtle mt-2 pt-2">
                <User className="w-5 h-5 text-text-muted" />
                <span className="text-body text-text-secondary">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full btn-secondary text-body px-3 py-2.5 flex items-center justify-center space-x-2"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
