import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';
import { Trophy, Medal, DollarSign, Users, TrendingUp, Award, Crown, Star, X } from 'lucide-react';

interface LeaderboardRecord {
  id: string;
  username: string;
  profile_pic: string | null;
  total_games: number;
  wins: number;
  losses: number;
  ties: number;
  win_percentage: number;
}

interface EarningsRecord {
  id: string;
  username: string;
  profile_pic: string | null;
  money_games_played: number;
  total_earnings: number;
  total_losses: number;
  total_wagered: number;
  win_percentage: number;
}

const Leaderboard: React.FC = () => {
  const [leagueARecords, setLeagueARecords] = useState<LeaderboardRecord[]>([]);
  const [leagueBRecords, setLeagueBRecords] = useState<LeaderboardRecord[]>([]);
  const [earningsRecords, setEarningsRecords] = useState<EarningsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'leagueA' | 'leagueB' | 'earnings'>('leagueA');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = getApiBaseUrl();

      const [leagueAResponse, leagueBResponse, earningsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/leaderboard/records?league=A`),
        fetch(`${apiBaseUrl}/api/leaderboard/records?league=B`),
        fetch(`${apiBaseUrl}/api/leaderboard/earnings`)
      ]);

      if (leagueAResponse.ok) {
        const data = await leagueAResponse.json();
        setLeagueARecords(data);
      }

      if (leagueBResponse.ok) {
        const data = await leagueBResponse.json();
        setLeagueBRecords(data);
      }

      if (earningsResponse.ok) {
        const data = await earningsResponse.json();
        setEarningsRecords(data);
      }

    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-8 text-center text-text-muted font-bold text-body">
          {index + 1}
        </span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-br from-yellow-400/20 via-yellow-500/10 to-transparent border-yellow-500/30';
      case 1:
        return 'bg-gradient-to-br from-gray-400/20 via-gray-500/10 to-transparent border-gray-400/30';
      case 2:
        return 'bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30';
      default:
        return 'bg-surface/40 border-border-subtle/30';
    }
  };

  const viewUserProfile = async (userId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userProfile = await response.json();
        setSelectedUser(userProfile);
        setShowUserProfileModal(true);
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-accent-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="card border-error/50 bg-error/10">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-heading-1 text-text-primary flex items-center gap-3 mb-3">
          <Trophy className="w-8 h-8 text-accent-secondary" />
          Leaderboard
        </h1>
        <p className="text-body text-text-secondary">Top performers across all sports and money games</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('leagueA')}
            className={`flex-shrink-0 px-6 py-3 rounded-pill font-medium text-body transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'leagueA'
                ? 'bg-accent-secondary text-app shadow-lg'
                : 'bg-surface/40 border border-border-subtle/50 text-text-secondary hover:bg-surface/60'
            }`}
          >
            <Star className="w-4 h-4" />
            League A Records
          </button>
          <button
            onClick={() => setActiveTab('leagueB')}
            className={`flex-shrink-0 px-6 py-3 rounded-pill font-medium text-body transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'leagueB'
                ? 'bg-accent-secondary text-app shadow-lg'
                : 'bg-surface/40 border border-border-subtle/50 text-text-secondary hover:bg-surface/60'
            }`}
          >
            <Star className="w-4 h-4" />
            League B Records
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex-shrink-0 px-6 py-3 rounded-pill font-medium text-body transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'earnings'
                ? 'bg-accent-secondary text-app shadow-lg'
                : 'bg-surface/40 border border-border-subtle/50 text-text-secondary hover:bg-surface/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Money Games Earnings
          </button>
        </div>
      </div>

      {/* League A Records */}
      {activeTab === 'leagueA' && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-heading-2 text-text-primary flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-accent-secondary" />
              League A - Best Records
            </h2>
            <p className="text-caption text-text-muted">Top performers in competitive League A games</p>
          </div>

          {leagueARecords.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-text-muted mb-4" />
              <p className="text-body text-text-secondary">No League A records yet</p>
              <p className="text-caption text-text-muted mt-1">Complete some League A games to appear on the leaderboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leagueARecords.map((record, index) => (
                <div
                  key={record.id}
                  className={`p-4 rounded-card border backdrop-blur-sm cursor-pointer hover:border-accent-primary/40 transition-all ${getRankColor(index)}`}
                  onClick={() => viewUserProfile(record.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center hover:bg-accent-primary/30 transition-all">
                      {record.profile_pic ? (
                        <img
                          src={record.profile_pic}
                          alt={record.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-heading-3 text-accent-primary font-bold">
                          {record.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-heading-3 text-text-primary truncate mb-1 hover:text-accent-primary transition-colors">{record.username}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
                        <span>{record.total_games} games</span>
                        <span>•</span>
                        <span>{record.wins}W - {record.losses}L{record.ties > 0 ? ` - ${record.ties}T` : ''}</span>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-heading-2 text-accent-primary font-bold">{record.win_percentage}%</div>
                      <div className="text-caption text-text-muted uppercase tracking-wider">Win Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* League B Records */}
      {activeTab === 'leagueB' && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-heading-2 text-text-primary flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-accent-secondary" />
              League B - Best Records
            </h2>
            <p className="text-caption text-text-muted">Top performers in recreational League B games</p>
          </div>

          {leagueBRecords.length === 0 ? (
            <div className="py-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-text-muted mb-4" />
              <p className="text-body text-text-secondary">No League B records yet</p>
              <p className="text-caption text-text-muted mt-1">Complete some League B games to appear on the leaderboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leagueBRecords.map((record, index) => (
                <div
                  key={record.id}
                  className={`p-4 rounded-card border backdrop-blur-sm cursor-pointer hover:border-accent-primary/40 transition-all ${getRankColor(index)}`}
                  onClick={() => viewUserProfile(record.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center hover:bg-accent-primary/30 transition-all">
                      {record.profile_pic ? (
                        <img
                          src={record.profile_pic}
                          alt={record.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-heading-3 text-accent-primary font-bold">
                          {record.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-heading-3 text-text-primary truncate mb-1 hover:text-accent-primary transition-colors">{record.username}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
                        <span>{record.total_games} games</span>
                        <span>•</span>
                        <span>{record.wins}W - {record.losses}L{record.ties > 0 ? ` - ${record.ties}T` : ''}</span>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-heading-2 text-accent-primary font-bold">{record.win_percentage}%</div>
                      <div className="text-caption text-text-muted uppercase tracking-wider">Win Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Money Games Earnings */}
      {activeTab === 'earnings' && (
        <div className="card">
          <div className="mb-6">
            <h2 className="text-heading-2 text-text-primary flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-accent-secondary" />
              Money Games - Top Earners
            </h2>
            <p className="text-caption text-text-muted">Highest earning players from money games</p>
          </div>

          {earningsRecords.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-text-muted mb-4" />
              <p className="text-body text-text-secondary">No money game earnings yet</p>
              <p className="text-caption text-text-muted mt-1">Participate in money games to appear on the earnings leaderboard</p>
            </div>
          ) : (
            <div className="space-y-3">
              {earningsRecords.map((record, index) => (
                <div
                  key={record.id}
                  className={`p-4 rounded-card border backdrop-blur-sm cursor-pointer hover:border-accent-primary/40 transition-all ${getRankColor(index)}`}
                  onClick={() => viewUserProfile(record.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {getRankIcon(index)}
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 bg-accent-primary/20 rounded-full flex items-center justify-center hover:bg-accent-primary/30 transition-all">
                      {record.profile_pic ? (
                        <img
                          src={record.profile_pic}
                          alt={record.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-heading-3 text-accent-primary font-bold">
                          {record.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-heading-3 text-text-primary truncate mb-1 hover:text-accent-primary transition-colors">{record.username}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-secondary">
                        <span>{record.money_games_played} money games</span>
                        <span>•</span>
                        <span>{record.win_percentage}% win rate</span>
                      </div>
                    </div>

                    {/* Earnings */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-heading-2 text-success font-bold">
                        ${record.total_earnings.toFixed(2)}
                      </div>
                      <div className="text-caption text-text-muted">
                        Net: ${(record.total_earnings - record.total_losses).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchLeaderboardData}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <TrendingUp className="w-5 h-5" />
          Refresh Leaderboard
        </button>
      </div>

      {/* User Profile Modal */}
      {showUserProfileModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="card w-full max-w-lg border-accent-primary/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-2 text-text-primary">Player Profile</h2>
              <button
                onClick={() => setShowUserProfileModal(false)}
                className="text-text-muted hover:text-text-primary transition-all duration-150"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-accent-primary rounded-full flex items-center justify-center text-app text-2xl font-bold">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-heading-2 text-text-primary">{selectedUser.username}</h3>
                  {selectedUser.location && (
                    <p className="text-body text-text-secondary">{selectedUser.location}</p>
                  )}
                  <p className="text-caption text-text-muted">
                    Joined {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="card bg-app">
                <h4 className="text-heading-3 text-text-primary mb-4">Game Statistics</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-heading-2 text-accent-primary">{selectedUser.stats?.total_games || 0}</p>
                    <p className="text-caption text-text-muted uppercase tracking-wider">Games</p>
                  </div>
                  <div className="text-center">
                    <p className="text-heading-2 text-success">{selectedUser.stats?.wins || 0}</p>
                    <p className="text-caption text-text-muted uppercase tracking-wider">Wins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-heading-2 text-error">{selectedUser.stats?.losses || 0}</p>
                    <p className="text-caption text-text-muted uppercase tracking-wider">Losses</p>
                  </div>
                </div>
                {selectedUser.stats && selectedUser.stats.total_games > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-body text-text-secondary">
                      Win Rate: <span className="text-accent-primary font-semibold">
                        {((selectedUser.stats.wins / selectedUser.stats.total_games) * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Favorite Sport */}
              {selectedUser.favorite_sport && (
                <div className="card bg-app">
                  <h4 className="text-heading-3 text-text-primary mb-2">Favorite Sport</h4>
                  <p className="text-body text-text-primary capitalize">{selectedUser.favorite_sport}</p>
                </div>
              )}

              {/* Sports */}
              {selectedUser.sports && selectedUser.sports.length > 0 && (
                <div className="card bg-app">
                  <h4 className="text-heading-3 text-text-primary mb-3">Sports & Skills</h4>
                  <div className="space-y-2">
                    {selectedUser.sports.map((sport: any) => (
                      <div key={sport.sport} className="flex items-center justify-between">
                        <p className="text-body text-text-primary capitalize">{sport.sport}</p>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < sport.skill_level ? 'bg-accent-primary' : 'bg-border-subtle'
                                }`}
                              />
                            ))}
                          </div>
                          {sport.is_primary ? (
                            <span className="chip chip-active text-[10px]">Primary</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t border-divider">
              <button
                onClick={() => setShowUserProfileModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
