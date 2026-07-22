import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';
import LocationAutocomplete from './LocationAutocomplete';

const sports = [
  { value: 'baseball', label: 'Baseball', emoji: '⚾' },
  { value: 'basketball', label: 'Basketball', emoji: '🏀' },
  { value: 'soccer', label: 'Soccer', emoji: '⚽' },
  { value: 'softball', label: 'Softball', emoji: '🥎' },
];

const CreateGame: React.FC = () => {
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('');
  const [location, setLocation] = useState('');
  const [locationData, setLocationData] = useState<any>(null);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [gameDate, setGameDate] = useState('');
  const [gameTime, setGameTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('A');
  const [isCasual, setIsCasual] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [minAge, setMinAge] = useState(0);
  const [isMoneyGame, setIsMoneyGame] = useState(false);
  const [entryFee, setEntryFee] = useState(0);
  
  const navigate = useNavigate();

  const getDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      options.push({ value: dateString, label: displayDate });
    }
    return options;
  };

  const getTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!gameDate || !gameTime || !level) {
      setError('Game date, time and level are required');
      setLoading(false);
      return;
    }
    
    const combinedDateTime = `${gameDate}T${gameTime}:00`;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          sport,
          location,
          locationData,
          maxPlayers: Number(maxPlayers),
          gameTime: combinedDateTime,
          level,
          isCasual,
          isPrivate,
          minAge: Number(minAge),
          isMoneyGame,
          entryFee: Number(entryFee)
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          setError('');
          setTimeout(() => {
            navigate(`/game/${data.id}`);
          }, 100);
        } else {
          console.error('No game ID in response:', data);
          navigate('/');
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center text-body text-text-secondary hover:text-text-primary mb-6 transition-all duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-heading-1 text-text-primary mb-2">Create a Pickup Game</h1>
          <p className="text-body text-text-secondary">Set up a new game and invite players to join</p>
        </div>

        <div className="card" style={{ backdropFilter: 'blur(12px)' }}>
          {error && (
            <div className="mb-6 card border-error/50 bg-error/10">
              <p className="text-body text-error">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                Game Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                placeholder="e.g., Weekend Basketball at Central Park"
              />
            </div>

            <div>
              <label htmlFor="sport" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                Sport
              </label>
              <select
                id="sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                required
                className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
              >
                <option value="">Select a sport</option>
                {sports.map((sportOption) => (
                  <option key={sportOption.value} value={sportOption.value}>
                    {sportOption.emoji} {sportOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="location" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                Location
              </label>
              <LocationAutocomplete
                value={location}
                onChange={(newLocation, data) => {
                  setLocation(newLocation);
                  setLocationData(data);
                }}
                placeholder="Search for a location..."
                required
              />
            </div>

            <div>
              <label htmlFor="maxPlayers" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                Maximum Players
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-text-muted" />
                </div>
                <input
                  type="number"
                  id="maxPlayers"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  min="2"
                  max="50"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                />
              </div>
              <p className="mt-2 text-caption text-text-muted">Choose between 2-50 players</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="gameDate" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                  Game Date
                </label>
                <select
                  id="gameDate"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                >
                  <option value="">Select a date</option>
                  {getDateOptions().map((dateOption) => (
                    <option key={dateOption.value} value={dateOption.value}>
                      {dateOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="gameTime" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                  Game Time
                </label>
                <select
                  id="gameTime"
                  value={gameTime}
                  onChange={(e) => setGameTime(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                >
                  <option value="">Select a time</option>
                  {getTimeOptions().map((timeOption) => (
                    <option key={timeOption.value} value={timeOption.value}>
                      {timeOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="level" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                  Skill Level
                </label>
                <select
                  id="level"
                  value={level}
                  onChange={e => setLevel(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                >
                  <option value="A">A (Advanced)</option>
                  <option value="B">B (Intermediate)</option>
                  <option value="C">C (Recreational)</option>
                </select>
              </div>

              <div>
                <label htmlFor="minAge" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                  Minimum Age (Optional)
                </label>
                <input
                  type="number"
                  id="minAge"
                  value={minAge}
                  onChange={e => setMinAge(parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                  placeholder="No minimum age"
                />
                <p className="mt-2 text-caption text-text-muted">Leave as 0 for no age restriction</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="isCasual"
                  type="checkbox"
                  checked={isCasual}
                  onChange={e => setIsCasual(e.target.checked)}
                  className="h-5 w-5 text-accent-primary focus:ring-accent-primary border-border-subtle rounded bg-app"
                />
                <label htmlFor="isCasual" className="ml-3 text-body text-text-secondary">
                  Casual Game (does not count towards record)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="isPrivate"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => setIsPrivate(e.target.checked)}
                  className="h-5 w-5 text-accent-primary focus:ring-accent-primary border-border-subtle rounded bg-app"
                />
                <label htmlFor="isPrivate" className="ml-3 text-body text-text-secondary">
                  Private Game (only accessible via direct link)
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="isMoneyGame"
                  type="checkbox"
                  checked={isMoneyGame}
                  onChange={e => setIsMoneyGame(e.target.checked)}
                  className="h-5 w-5 text-accent-primary focus:ring-accent-primary border-border-subtle rounded bg-app"
                />
                <label htmlFor="isMoneyGame" className="ml-3 text-body text-text-secondary">
                  Money Game (entry fee required)
                </label>
              </div>
            </div>

            {isMoneyGame && (
              <div className="card border-accent-secondary/30 bg-accent-secondary/10">
                <h3 className="text-heading-3 text-text-primary mb-4">Money Game Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="entryFee" className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                      Entry Fee per Player ($)
                    </label>
                    <input
                      type="number"
                      id="entryFee"
                      value={entryFee}
                      onChange={e => setEntryFee(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="card bg-app">
                    <div className="text-body text-text-secondary space-y-2">
                      <div className="flex justify-between">
                        <span>Total Pot:</span>
                        <span className="font-semibold text-success">${(entryFee * maxPlayers).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Winning Team Gets:</span>
                        <span className="font-semibold text-success">${(entryFee * maxPlayers).toFixed(2)}</span>
                      </div>
                      <div className="text-caption text-text-muted mt-3 pt-3 border-t border-divider">
                        * 50/50 odds - winning team splits the entire pot
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-divider">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Game'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateGame;
