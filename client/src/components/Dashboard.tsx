import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, MapPin, Calendar, Circle, Target, Search, Filter, X, Share2, ChevronRight } from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';
import LocationAutocomplete from './LocationAutocomplete';

interface Game {
  id: string;
  title: string;
  sport: string;
  location: string;
  max_players: number;
  current_players: number;
  creator_name: string;
  created_at: string;
  game_time?: string;
  level?: string;
  is_casual?: number;
  is_private?: boolean;
  min_age?: number;
  is_money_game?: boolean;
  entry_fee?: number;
  total_pot?: number;
  location_lat?: number;
  location_lng?: number;
}

const sportIcons: { [key: string]: React.ComponentType<any> } = {
  baseball: Circle,
  basketball: Circle,
  soccer: Target,
  softball: Circle,
};

const sportColors: { [key: string]: string } = {
  baseball: 'bg-accent-primary',
  basketball: 'bg-accent-secondary',
  soccer: 'bg-success',
  softball: 'bg-accent-primary',
};

const availableSports = [
  'baseball', 'basketball', 'soccer', 'softball'
];

const Dashboard: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [joinedGames, setJoinedGames] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    sport: '',
    searchTerm: '',
    level: '',
    showCasual: false
  });
  const [searchLocation, setSearchLocation] = useState('');
  const [searchLocationData, setSearchLocationData] = useState<any>(null);
  const [searchRadius, setSearchRadius] = useState(6);
  const [showFilters, setShowFilters] = useState(false);
  const [, setLinkCopied] = useState(false);
  const [nearbyGames, setNearbyGames] = useState<Game[]>([]);
  const [, setNearbyGamesLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { user } = useAuth();

  const fetchGames = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      
      const params = new URLSearchParams();
      if (searchLocationData?.lat && searchLocationData?.lng && searchRadius) {
        params.append('lat', searchLocationData.lat.toString());
        params.append('lng', searchLocationData.lng.toString());
        params.append('radius', (searchRadius * 1.609344).toString());
      }
      
      const response = await fetch(`${apiBaseUrl}/api/games?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
        setFilteredGames(data);
        if (user) {
          fetchJoinedGames(data);
        }
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [user, searchLocationData, searchRadius]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const applyFilters = useCallback(() => {
    let filtered = games;

    if (filters.sport) {
      filtered = filtered.filter(game => 
        game.sport.toLowerCase() === filters.sport.toLowerCase()
      );
    }

    if (filters.searchTerm) {
      filtered = filtered.filter(game => 
        game.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        game.creator_name.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    if (filters.level) {
      filtered = filtered.filter(game => game.level === filters.level);
    }
    if (filters.showCasual) {
      filtered = filtered.filter(game => game.is_casual);
    }

    // Sort by distance if user location is available
    if (userLocation) {
      filtered = filtered.sort((a, b) => {
        const distA = (a.location_lat && a.location_lng)
          ? calculateDistance(userLocation.lat, userLocation.lng, a.location_lat, a.location_lng)
          : Infinity;
        const distB = (b.location_lat && b.location_lng)
          ? calculateDistance(userLocation.lat, userLocation.lng, b.location_lat, b.location_lng)
          : Infinity;
        return distA - distB;
      });
    }

    setFilteredGames(filtered);
  }, [games, filters, userLocation]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilters({
      sport: '',
      searchTerm: '',
      level: '',
      showCasual: false
    });
  };

  const getShareLink = (gameId: string) => {
    return `${window.location.origin}/game/${gameId}`;
  };

  const copyToClipboard = async (gameId: string) => {
    try {
      await navigator.clipboard.writeText(getShareLink(gameId));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = getShareLink(gameId);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareGame = async (game: Game) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: game.title,
          text: `Join me for a game of ${game.sport} at ${game.location}!`,
          url: getShareLink(game.id),
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyToClipboard(game.id);
    }
  };

  const hasActiveFilters = filters.sport || filters.searchTerm || filters.level || filters.showCasual;

  const fetchJoinedGames = useCallback(async (gamesList: Game[]) => {
    if (!user || gamesList.length === 0) return;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const joinedSet = new Set<string>();
      
      for (const game of gamesList) {
        const response = await fetch(`${apiBaseUrl}/api/games/${game.id}/joined`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const { joined } = await response.json();
          if (joined) {
            joinedSet.add(game.id);
          }
        }
      }
      
      setJoinedGames(joinedSet);
    } catch (error) {
      console.error('Error fetching joined games:', error);
    }
  }, [user]);

  const joinGame = useCallback(async (gameId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setJoinedGames(prev => new Set(Array.from(prev).concat(gameId)));
        fetchGames();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game');
    }
  }, [fetchGames]);

  const leaveGame = useCallback(async (gameId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/games/${gameId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setJoinedGames(prev => {
          const newSet = new Set(prev);
          newSet.delete(gameId);
          return newSet;
        });
        fetchGames();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to leave game');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
      alert('Failed to leave game');
    }
  }, [fetchGames]);

  const cancelGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to cancel this game? This cannot be undone.')) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchGames();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel game');
      }
    } catch (error) {
      alert('Failed to cancel game');
    }
  };

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          fetchNearbyGames(latitude, longitude);
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  }, []);

  const fetchNearbyGames = async (lat: number, lng: number) => {
    setNearbyGamesLoading(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const radiusInKm = 3 * 1.609344;
      const params = new URLSearchParams();
      params.append('lat', lat.toString());
      params.append('lng', lng.toString());
      params.append('radius', radiusInKm.toString());
      
      const response = await fetch(`${apiBaseUrl}/api/games?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNearbyGames(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching nearby games:', error);
    } finally {
      setNearbyGamesLoading(false);
    }
  };

  const extractCity = (location: string): string => {
    if (!location) return 'Unknown';
    const parts = location.split(',').map(s => s.trim());
    if (parts.length === 0) return location;
    
    if (parts.length >= 2) {
      if (parts.length >= 3) {
        return parts[parts.length - 2];
      } else {
        return parts[0];
      }
    }
    return parts[0] || location;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-app">
        <div className="animate-spin rounded-full h-16 w-16 border-2 border-accent-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-3 py-4 pb-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-caption text-text-secondary uppercase tracking-wider mb-1">Welcome back</p>
              <h1 className="text-heading-1 text-text-primary">{user?.username}</h1>
            </div>
            <Link
              to="/create-game"
              className="btn-primary inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 card border-error/50 bg-error/10">
            <p className="text-body text-error">{error}</p>
          </div>
        )}

        {/* Hero Card - Nearby Games */}
        {nearbyGames.length > 0 && (
          <div className="card mb-4 border-accent-primary/20" style={{ backdropFilter: 'blur(12px)', boxShadow: '0 2px 8px rgba(0, 240, 255, 0.1), 0 8px 24px rgba(0, 0, 0, 0.3)' }}>
            <p className="text-caption text-text-secondary uppercase tracking-wider mb-1">TONIGHT · NEARBY</p>
            <h2 className="text-heading-1 text-text-primary mb-1">{nearbyGames.length} PICKUP GAMES YOU CAN JOIN</h2>
            <p className="text-body text-text-secondary mb-3">Within 3 miles of your location</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {nearbyGames.map((game) => {
                const SportIcon = sportIcons[game.sport.toLowerCase()] || Circle;
                const sportColor = sportColors[game.sport.toLowerCase()] || 'bg-accent-primary';
                
                return (
                  <Link
                    key={game.id}
                    to={`/game/${game.id}`}
                    className="bg-surface/60 backdrop-blur-sm rounded-card p-3 border border-border-subtle/30 hover:border-accent-primary/40 hover:bg-surface/80 transition-all duration-200"
                    style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 ${sportColor} rounded-lg flex items-center justify-center`}>
                        <SportIcon className="w-4 h-4 text-app" />
                      </div>
                      <span className="text-caption text-text-muted capitalize">{game.sport}</span>
                    </div>
                    <h3 className="text-heading-3 text-text-primary mb-2 line-clamp-2">{game.title}</h3>
                    <p className="text-caption text-text-secondary mb-2">{extractCity(game.location)}</p>
                    <div className="flex items-center text-caption text-text-muted">
                      <Users className="w-3 h-3 mr-1" />
                      <span>{game.current_players}/{game.max_players}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="card mb-4" style={{ backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-2 text-text-primary flex items-center">
              <Search className="w-5 h-5 mr-2 text-accent-primary" />
              Find Game
            </h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="chip"
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? 'Hide' : 'Filters'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Search games by player"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
              />
            </div>
          </div>

          {/* Location Search */}
          <div className="mb-3 p-3 bg-surface/40 backdrop-blur-sm rounded-card border border-border-subtle/30" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' }}>
            <p className="text-caption text-text-secondary uppercase tracking-wider mb-2">Search by Location</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-caption text-text-secondary mb-2">Location</label>
                <LocationAutocomplete
                  value={searchLocation}
                  onChange={(newLocation, data) => {
                    setSearchLocation(newLocation);
                    setSearchLocationData(data);
                  }}
                  placeholder="Search for a location..."
                />
              </div>
              <div>
                <label className="block text-caption text-text-secondary mb-2">Radius (miles)</label>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                >
                  <option value={3}>3 miles</option>
                  <option value={6}>6 miles</option>
                  <option value={15}>15 miles</option>
                  <option value={30}>30 miles</option>
                  <option value={60}>60 miles</option>
                </select>
              </div>
            </div>
            {(searchLocation || searchLocationData) && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-caption text-text-secondary">
                  {searchLocation && (
                    <span>Searching near: <strong className="text-text-primary">{searchLocation}</strong></span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchLocation('');
                    setSearchLocationData(null);
                  }}
                  className="text-caption text-error hover:text-error/80 transition-all duration-150"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-caption text-text-secondary mb-2">Sport</label>
                <select
                  value={filters.sport}
                  onChange={(e) => setFilters(prev => ({ ...prev, sport: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                >
                  <option value="">All Sports</option>
                  {availableSports.map(sport => (
                    <option key={sport} value={sport}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-caption text-text-secondary mb-2">Skill Level</label>
                <select
                  value={filters.level}
                  onChange={e => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                >
                  <option value="">All Levels</option>
                  <option value="A">A (Advanced)</option>
                  <option value="B">B (Intermediate)</option>
                  <option value="C">C (Recreational)</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  id="showCasual"
                  type="checkbox"
                  checked={filters.showCasual}
                  onChange={e => setFilters(prev => ({ ...prev, showCasual: e.target.checked }))}
                  className="h-5 w-5 text-accent-primary focus:ring-accent-primary border-border-subtle rounded bg-app"
                />
                <label htmlFor="showCasual" className="ml-3 text-body text-text-secondary">
                  Show only Casual Games
                </label>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-caption text-text-secondary">Active:</span>
                {filters.sport && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sport: '' }))}
                    className="chip chip-active"
                  >
                    {filters.sport}
                    <X className="w-3 h-3 ml-1" />
                  </button>
                )}
                {filters.searchTerm && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                    className="chip chip-active"
                  >
                    {filters.searchTerm}
                    <X className="w-3 h-3 ml-1" />
                  </button>
                )}
                {filters.level && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, level: '' }))}
                    className="chip chip-active"
                  >
                    Level: {filters.level}
                    <X className="w-3 h-3 ml-1" />
                  </button>
                )}
                {filters.showCasual && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, showCasual: false }))}
                    className="chip chip-active"
                  >
                    Casual
                    <X className="w-3 h-3 ml-1" />
                  </button>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-caption text-text-secondary hover:text-text-primary transition-all duration-150"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* My Games Section */}
        {user && joinedGames.size > 0 && (
          <div className="mb-6">
            <div className="mb-3">
              <h3 className="text-heading-2 text-text-primary">MY GAMES ({joinedGames.size})</h3>
            </div>
            <div className="space-y-3 sm:space-y-2">
              {filteredGames.filter(game => joinedGames.has(game.id)).map((game) => {
                const SportIcon = sportIcons[game.sport.toLowerCase()] || Circle;
                const sportColor = sportColors[game.sport.toLowerCase()] || 'bg-accent-primary';
                const isFull = game.current_players >= game.max_players;
                const cleanLevel = game.level ? game.level.toString().replace(/0+$/, '').replace(/[^A-C]/, '') : null;
                
                return (
                  <div key={game.id} className="card group transition-all duration-200 border-accent-primary/30" style={{ backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${sportColor} rounded-card flex items-center justify-center flex-shrink-0`}>
                          <SportIcon className="w-5 h-5 sm:w-6 sm:h-6 text-app" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1.5 sm:mb-2">
                            <span className="text-caption text-text-secondary uppercase tracking-wider">{game.sport}</span>
                            {cleanLevel && (
                              <span className="text-caption text-text-muted">· Level {cleanLevel}</span>
                            )}
                            {game.is_casual === 1 && (
                              <span className="text-caption text-accent-secondary">· Casual</span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-heading-3 text-text-primary mb-2 line-clamp-2 sm:line-clamp-1">{game.title}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-body text-text-secondary">
                            <div className="flex items-center min-w-0">
                              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{game.location}</span>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{game.current_players}/{game.max_players}</span>
                            </div>
                            {game.game_time && (
                              <div className="flex items-center flex-shrink-0">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span className="whitespace-nowrap">{formatDate(game.game_time)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-all duration-150 flex-shrink-0 ml-2 sm:ml-4 hidden sm:block" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-divider/30">
                      <span className="text-caption text-text-muted">by {game.creator_name}</span>
                      <div className="flex items-center justify-end sm:justify-start gap-2 flex-wrap">
                        <button
                          onClick={() => shareGame(game)}
                          className="p-2 rounded-card border border-border-subtle/50 hover:border-accent-primary/50 hover:bg-surface/50 text-text-secondary hover:text-accent-primary transition-all duration-200 backdrop-blur-sm flex-shrink-0"
                          title="Share game"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/game/${game.id}`}
                          className="btn-secondary text-caption px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => leaveGame(game.id)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill text-caption font-semibold bg-success text-app transition-all duration-150 whitespace-nowrap flex-shrink-0"
                        >
                          Joined
                        </button>
                        {user && user.username === game.creator_name && (
                          <button
                            onClick={() => cancelGame(game.id)}
                            className="btn-destructive text-caption px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-20 w-20 bg-surface rounded-full flex items-center justify-center mb-6 border border-border-subtle">
              <Search className="h-10 w-10 text-text-muted" />
            </div>
            <h3 className="text-heading-2 text-text-primary mb-2">
              {hasActiveFilters ? 'No games match your filters' : 'No games available'}
            </h3>
            <p className="text-body text-text-secondary mb-8">
              {hasActiveFilters 
                ? 'Try adjusting your search criteria or clear filters to see all games.'
                : 'Be the first to create a pickup game!'
              }
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="btn-primary"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </button>
            ) : (
              <Link
                to="/create-game"
                className="btn-primary inline-flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Game
              </Link>
            )}
          </div>
        ) : (
          <>
            {(() => {
              // Filter out games that user has joined (they're in "My Games" section)
              const gamesToShow = user 
                ? filteredGames.filter(game => !joinedGames.has(game.id))
                : filteredGames;
              
              if (gamesToShow.length === 0) return null;
              
              return (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-heading-2 text-text-primary">
                        {hasActiveFilters 
                          ? `${gamesToShow.length} GAME${gamesToShow.length !== 1 ? 'S' : ''}`
                          : `ALL GAMES (${gamesToShow.length})`
                        }
                      </h3>
                      {hasActiveFilters && (
                        <span className="text-caption text-text-secondary">
                          {gamesToShow.length} of {games.length} total
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-2">
                    {gamesToShow.map((game) => {
                const SportIcon = sportIcons[game.sport.toLowerCase()] || Circle;
                const sportColor = sportColors[game.sport.toLowerCase()] || 'bg-accent-primary';
                const isJoined = joinedGames.has(game.id);
                const isFull = game.current_players >= game.max_players && !isJoined;
                // Clean level value - remove any trailing 0 or invalid characters
                const cleanLevel = game.level ? game.level.toString().replace(/0+$/, '').replace(/[^A-C]/, '') : null;
                
                return (
                  <div key={game.id} className="card group transition-all duration-200" style={{ backdropFilter: 'blur(12px)' }}>
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 ${sportColor} rounded-card flex items-center justify-center flex-shrink-0`}>
                          <SportIcon className="w-5 h-5 sm:w-6 sm:h-6 text-app" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1.5 sm:mb-2">
                            <span className="text-caption text-text-secondary uppercase tracking-wider">{game.sport}</span>
                            {cleanLevel && (
                              <span className="text-caption text-text-muted">· Level {cleanLevel}</span>
                            )}
                            {game.is_casual === 1 && (
                              <span className="text-caption text-accent-secondary">· Casual</span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-heading-3 text-text-primary mb-2 line-clamp-2 sm:line-clamp-1">{game.title}</h3>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-body text-text-secondary">
                            <div className="flex items-center min-w-0">
                              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                              <span className="truncate">{game.location}</span>
                            </div>
                            <div className="flex items-center flex-shrink-0">
                              <Users className="w-4 h-4 mr-1" />
                              <span>{game.current_players}/{game.max_players}</span>
                            </div>
                            {game.game_time && (
                              <div className="flex items-center flex-shrink-0">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span className="whitespace-nowrap">{formatDate(game.game_time)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-all duration-150 flex-shrink-0 ml-2 sm:ml-4 hidden sm:block" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-divider/30">
                      <span className="text-caption text-text-muted">by {game.creator_name}</span>
                      <div className="flex items-center justify-end sm:justify-start gap-2 flex-wrap">
                        <button
                          onClick={() => shareGame(game)}
                          className="p-2 rounded-card border border-border-subtle/50 hover:border-accent-primary/50 hover:bg-surface/50 text-text-secondary hover:text-accent-primary transition-all duration-200 backdrop-blur-sm flex-shrink-0"
                          title="Share game"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/game/${game.id}`}
                          className="btn-secondary text-caption px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => isJoined ? leaveGame(game.id) : joinGame(game.id)}
                          disabled={isFull}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-pill text-caption font-semibold transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
                            isJoined
                              ? 'bg-success text-app'
                              : isFull
                              ? 'bg-surface text-text-muted cursor-not-allowed border border-border-subtle'
                              : 'btn-primary'
                          }`}
                        >
                          {isJoined ? 'Joined' : isFull ? 'Full' : 'Join'}
                        </button>
                        {user && user.username === game.creator_name && (
                          <button
                            onClick={() => cancelGame(game.id)}
                            className="btn-destructive text-caption px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                    })}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
