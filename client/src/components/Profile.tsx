import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/api';
import { User, MapPin, Calendar, Trophy, Star, Camera, Save, Edit, Clock, Users, DollarSign, Home, Navigation } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';

interface Sport {
  sport: string;
  skill_level: number;
  is_primary: boolean;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  age: number | null;
  location: string | null;
  current_location: string | null;
  current_location_lat: number | null;
  current_location_lng: number | null;
  home_location: string | null;
  home_location_lat: number | null;
  home_location_lng: number | null;
  favorite_sport: string | null;
  profile_pic: string | null;
  created_at: string;
  sports: Sport[];
  stats: {
    total_games: number;
    wins: number;
    losses: number;
  };
}

interface GameHistory {
  game_id: string;
  title: string;
  sport: string;
  location: string;
  game_time: string;
  level: string;
  is_casual: number;
  is_money_game: number;
  entry_fee: number;
  total_pot: number;
  game_created_at: string;
  result: string;
  score: number;
  completed_at: string;
  participants: {
    id: string;
    username: string;
    age: number | null;
    result: string;
    score: number;
  }[];
}

const availableSports = [
  'baseball', 'basketball', 'soccer', 'softball'
];

const skillLevels = [
  { level: 1, name: 'Amateur', description: 'Just starting out' },
  { level: 2, name: 'Beginner', description: 'Learning the basics' },
  { level: 3, name: 'Intermediate', description: 'Getting comfortable' },
  { level: 4, name: 'Advanced', description: 'Experienced player' },
  { level: 5, name: 'Expert', description: 'Highly skilled' }
];

const Profile: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    age: '',
    location: '',
    current_location: '',
    current_location_lat: null as number | null,
    current_location_lng: null as number | null,
    home_location: '',
    home_location_lat: null as number | null,
    home_location_lng: null as number | null,
    favorite_sport: '',
    profile_pic: '',
    sports: [] as Sport[]
  });

  useEffect(() => {
    fetchProfile();
    fetchGameHistory();
  }, []);

  const fetchGameHistory = async () => {
    setHistoryLoading(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/profile/game-history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGameHistory(data);
      } else {
        console.error('Failed to fetch game history');
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      
      console.log('Fetching profile from:', `${apiBaseUrl}/api/profile`);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${apiBaseUrl}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Profile data:', data);
        setProfile(data);
        setFormData({
          username: data.username || '',
          age: data.age?.toString() || '',
          location: data.location || '',
          current_location: data.current_location || '',
          current_location_lat: data.current_location_lat || null,
          current_location_lng: data.current_location_lng || null,
          home_location: data.home_location || '',
          home_location_lat: data.home_location_lat || null,
          home_location_lng: data.home_location_lng || null,
          favorite_sport: data.favorite_sport || '',
          profile_pic: data.profile_pic || '',
          sports: data.sports || []
        });
      } else {
        const errorText = await response.text();
        console.error('Profile fetch failed:', response.status, errorText);
        setError(`Failed to load profile: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null
        })
      });

      if (response.ok) {
        await fetchProfile();
        setIsEditing(false);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const addSport = () => {
    if (formData.sports.length < 3) {
      setFormData(prev => ({
        ...prev,
        sports: [...prev.sports, { sport: 'basketball', skill_level: 1, is_primary: false }]
      }));
    }
  };

  const removeSport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.filter((_, i) => i !== index)
    }));
  };

  const updateSport = (index: number, field: keyof Sport, value: any) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.map((sport, i) => 
        i === index ? { ...sport, [field]: value } : sport
      )
    }));
  };

  const setPrimarySport = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sports: prev.sports.map((sport, i) => ({
        ...sport,
        is_primary: i === index
      }))
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error || 'Profile not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary">Player Profile</h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-4 py-2 border border-border-subtle text-sm font-medium rounded-md text-text-secondary bg-surface/80 backdrop-blur-md hover:bg-surface/60"
          >
            {isEditing ? <Edit className="w-4 h-4 mr-2" /> : <Edit className="w-4 h-4 mr-2" />}
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
                  {formData.profile_pic ? (
                    <img 
                      src={formData.profile_pic} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-text-muted" />
                  )}
                </div>
                {isEditing && (
                  <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="text-2xl font-bold text-text-primary bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none text-center w-full"
                  placeholder="Enter username"
                />
              ) : (
                <h2 className="text-2xl font-bold text-text-primary break-all truncate max-w-full text-center" style={{wordBreak: 'break-all'}}>{profile.username}</h2>
              )}
              {/* Email display */}
              <div className="mt-2 text-gray-600 text-sm break-all truncate max-w-full text-center" style={{wordBreak: 'break-all'}}>
                {profile.email}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                    className="bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none flex-1"
                    placeholder="Age"
                  />
                ) : (
                  <span>{profile.age || 'Not set'}</span>
                )}
              </div>

              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none flex-1"
                    placeholder="General Location"
                  />
                ) : (
                  <span>{profile.location || 'Not set'}</span>
                )}
              </div>

              <div className="flex items-center text-gray-600">
                <Navigation className="w-4 h-4 mr-2" />
                {isEditing ? (
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={formData.current_location}
                      onChange={(location, locationData) => setFormData(prev => ({ 
                        ...prev, 
                        current_location: location,
                        current_location_lat: locationData?.lat || null,
                        current_location_lng: locationData?.lng || null
                      }))}
                      placeholder="Current Location"
                      className="bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none w-full"
                    />
                  </div>
                ) : (
                  <span>{profile.current_location || 'Not set'}</span>
                )}
              </div>

              <div className="flex items-center text-gray-600">
                <Home className="w-4 h-4 mr-2" />
                {isEditing ? (
                  <div className="flex-1">
                    <LocationAutocomplete
                      value={formData.home_location}
                      onChange={(location, locationData) => setFormData(prev => ({ 
                        ...prev, 
                        home_location: location,
                        home_location_lat: locationData?.lat || null,
                        home_location_lng: locationData?.lng || null
                      }))}
                      placeholder="Home Location"
                      className="bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none w-full"
                    />
                  </div>
                ) : (
                  <span>{profile.home_location || 'Not set'}</span>
                )}
              </div>

              <div className="flex items-center text-gray-600">
                <Trophy className="w-4 h-4 mr-2" />
                {isEditing ? (
                  <select
                    value={formData.favorite_sport}
                    onChange={(e) => setFormData(prev => ({ ...prev, favorite_sport: e.target.value }))}
                    className="bg-transparent border-b border-border-subtle focus:border-blue-500 outline-none flex-1"
                  >
                    <option value="">Select Favorite Sport</option>
                    {availableSports.map(sport => (
                      <option key={sport} value={sport}>
                        {sport.charAt(0).toUpperCase() + sport.slice(1)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{profile.favorite_sport ? profile.favorite_sport.charAt(0).toUpperCase() + profile.favorite_sport.slice(1) : 'Not set'}</span>
                )}
              </div>

              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sports & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Game Statistics */}
          <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-4">Game Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{profile.stats.total_games}</div>
                <div className="text-sm text-gray-600">Total Games</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{profile.stats.wins}</div>
                <div className="text-sm text-gray-600">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{profile.stats.losses}</div>
                <div className="text-sm text-gray-600">Losses</div>
              </div>
            </div>
            {profile.stats.total_games > 0 && (
              <div className="mt-4 text-center">
                <div className="text-lg font-semibold text-text-primary">
                  Win Rate: {((profile.stats.wins / profile.stats.total_games) * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>

          {/* Sports Preferences */}
          <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Top Sports</h3>
              {isEditing && formData.sports.length < 3 && (
                <button
                  onClick={addSport}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Star className="w-4 h-4 mr-1" />
                  Add Sport
                </button>
              )}
            </div>

            {formData.sports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {isEditing ? 'Add your top sports to get started!' : 'No sports preferences set'}
              </div>
            ) : (
              <div className="space-y-4">
                {formData.sports.map((sport, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    {isEditing ? (
                      <>
                        <select
                          value={sport.sport}
                          onChange={(e) => updateSport(index, 'sport', e.target.value)}
                          className="flex-1 border border-border-subtle rounded-md px-3 py-2"
                        >
                          {availableSports.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                        
                        <select
                          value={sport.skill_level}
                          onChange={(e) => updateSport(index, 'skill_level', parseInt(e.target.value))}
                          className="w-32 border border-border-subtle rounded-md px-3 py-2"
                        >
                          {skillLevels.map(level => (
                            <option key={level.level} value={level.level}>
                              {level.name}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => setPrimarySport(index)}
                          className={`px-3 py-2 rounded-md text-sm font-medium ${
                            sport.is_primary
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-text-secondary hover:bg-surface'
                          }`}
                        >
                          {sport.is_primary ? 'Primary' : 'Set Primary'}
                        </button>

                        <button
                          onClick={() => removeSport(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-text-primary capitalize">{sport.sport}</div>
                          <div className="text-sm text-gray-600">
                            {skillLevels.find(l => l.level === sport.skill_level)?.name}
                          </div>
                        </div>
                        {sport.is_primary && (
                          <div className="flex items-center text-yellow-600">
                            <Star className="w-4 h-4 mr-1" />
                            <span className="text-sm font-medium">Primary</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          )}

          {/* Game History */}
          <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-text-primary">Game History</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                {gameHistory.length} completed games
              </div>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : gameHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="mx-auto h-12 w-12 text-text-muted mb-4" />
                <p>No completed games yet</p>
                <p className="text-sm">Join and complete games to see your history here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gameHistory.map((game) => (
                  <div key={game.game_id} className="border border-gray-200 rounded-lg p-4 hover:bg-surface/60 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-semibold text-text-primary">{game.title}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            game.result === 'win' 
                              ? 'bg-green-100 text-green-800' 
                              : game.result === 'loss'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {game.result === 'win' ? 'W' : game.result === 'loss' ? 'L' : 'T'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {game.sport} • {game.location}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(game.game_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="bg-gray-100 text-text-secondary px-2 py-1 rounded">Level: {game.level}</span>
                          {game.is_casual ? (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Casual</span>
                          ) : null}
                          {game.is_money_game ? (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded flex items-center">
                              <DollarSign className="w-3 h-3 mr-1" />
                              ${game.entry_fee} entry
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-text-primary">Score: {game.score}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(game.completed_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Teams */}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-text-secondary flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          Teams
                        </h5>
                        <span className="text-xs text-gray-500">
                          {game.participants.length} players
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Winning Team */}
                        <div>
                          <div className="text-xs font-medium text-green-700 mb-2">Winning Team</div>
                          <div className="space-y-1">
                            {game.participants
                              .filter(p => p.result === 'win')
                              .map((player) => (
                                <div key={player.id} className="flex items-center justify-between text-sm">
                                  <span className="text-text-primary">{player.username}</span>
                                  <span className="text-gray-500">Score: {player.score}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                        
                        {/* Losing Team */}
                        <div>
                          <div className="text-xs font-medium text-red-700 mb-2">Losing Team</div>
                          <div className="space-y-1">
                            {game.participants
                              .filter(p => p.result === 'loss')
                              .map((player) => (
                                <div key={player.id} className="flex items-center justify-between text-sm">
                                  <span className="text-text-primary">{player.username}</span>
                                  <span className="text-gray-500">Score: {player.score}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 