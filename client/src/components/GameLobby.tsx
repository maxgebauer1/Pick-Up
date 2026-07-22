import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, MapPin, Calendar, ArrowLeft, UserPlus, UserMinus, UserCheck, Flag, X, Share2, Copy, Check, Lock } from 'lucide-react';
import { io } from 'socket.io-client';
import { getApiBaseUrl } from '../utils/api';
import Chat from './Chat';

interface Participant {
  id: string;
  username: string;
  joined_at: string;
}

interface Game {
  id: string;
  title: string;
  sport: string;
  location: string;
  max_players: number;
  creator_name: string;
  created_at: string;
  is_private?: boolean;
  min_age?: number;
  is_money_game?: boolean;
  entry_fee?: number;
  total_pot?: number;
}

const GameLobby: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [results, setResults] = useState<{homeScore: string, awayScore: string}>({homeScore: '', awayScore: ''});
  const [friends, setFriends] = useState<string[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingUser, setReportingUser] = useState<Participant | null>(null);
  const [reportData, setReportData] = useState({reason: '', description: ''});
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  const fetchFriends = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/friends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const friendsData = await response.json();
        setFriends(friendsData.map((f: any) => f.id));
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ friendId })
      });
      
      if (response.ok) {
        alert('Friend request sent successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to send friend request');
      }
    } catch (error) {
      alert('Failed to send friend request');
    }
  };

  const openReportModal = (participant: Participant) => {
    setReportingUser(participant);
    setReportData({reason: '', description: ''});
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportingUser || !reportData.reason) {
      alert('Please select a reason for the report');
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportedUserId: reportingUser.id,
          gameId: gameId,
          reason: reportData.reason,
          description: reportData.description
        })
      });

      if (response.ok) {
        alert('Report submitted successfully!');
        setShowReportModal(false);
        setReportingUser(null);
        setReportData({reason: '', description: ''});
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit report');
      }
    } catch (error) {
      alert('Failed to submit report');
    }
  };

  const getShareLink = () => {
    return `${window.location.origin}/game/${gameId}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = getShareLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareGame = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: game?.title || 'Pick Up Game',
          text: `Join me for a game of ${game?.sport} at ${game?.location}!`,
          url: getShareLink(),
        });
      } catch (err) {
        // User cancelled sharing or error occurred
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to show share modal
      setShowShareModal(true);
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

  useEffect(() => {
    const apiBaseUrl = getApiBaseUrl();
    const newSocket = io(apiBaseUrl);
    setSocket(newSocket);

    const setupSocket = () => {
      // Join game room with user info for chat
      newSocket.emit('joinGameRoom', {
        gameId,
        userId: user?.id,
        username: user?.username
      });

      newSocket.on('user-joined', (data) => {
        setParticipants(prev => [...prev, data.user]);
      });

      newSocket.on('user-left', (data) => {
        setParticipants(prev => prev.filter(p => p.id !== data.user.id));
      });

      newSocket.on('message', (data) => {
        // Handle messages if needed in the future
        console.log('Message received:', data);
      });
    };

    const fetchGameDetails = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/games/${gameId}`);
        if (response.ok) {
          const game = await response.json();
          setGame(game);
        } else if (response.status === 404) {
          setError('Game not found');
        } else {
          setError('Failed to load game details');
        }
      } catch (error) {
        setError('Failed to load game details');
      }
    };

    const fetchParticipants = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/games/${gameId}/participants`);
        if (response.ok) {
          const data = await response.json();
          setParticipants(data);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    setupSocket();
    fetchGameDetails();
    fetchParticipants();
    fetchFriends();

    return () => {
      newSocket.emit('leaveGameRoom', gameId);
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const leaveGame = async () => {
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
        navigate('/');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
    }
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

  if (error || !game) {
    return (
      <div className="min-h-screen bg-app px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="card border-error/50 bg-error/10 mb-4">
            <p className="text-body text-error">{error || 'Game not found'}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-body text-text-secondary hover:text-text-primary mb-4 transition-all duration-150"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="card mb-6" style={{ backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-heading-1 text-text-primary">{game.title}</h1>
                {game.is_private ? (
                  <span className="chip chip-active">
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </span>
                ) : null}
              </div>
              <p className="text-body text-text-secondary capitalize">{game.sport}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={shareGame}
                className="btn-secondary text-caption px-4 py-2"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </button>
              {user && participants.some(p => p.id === user.id) && (
                <button
                  onClick={leaveGame}
                  className="btn-destructive text-caption px-4 py-2"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave
                </button>
              )}
              {user && game && user.username === game.creator_name && (
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="px-4 py-2 rounded-pill text-caption font-semibold bg-success text-app transition-all duration-150 hover:opacity-90"
                >
                  Complete Game
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center text-body text-text-secondary">
              <MapPin className="w-4 h-4 mr-2 text-accent-primary" />
              {game.location}
            </div>
            <div className="flex items-center text-body text-text-secondary">
              <Users className="w-4 h-4 mr-2 text-accent-primary" />
              {participants.length}/{game.max_players} players
            </div>
            <div className="flex items-center text-body text-text-secondary">
              <Calendar className="w-4 h-4 mr-2 text-accent-primary" />
              {formatDate(game.created_at)}
            </div>
            {game.min_age && game.min_age > 0 ? (
              <div className="flex items-center text-body text-text-secondary">
                <span className="w-4 h-4 mr-2 text-center text-caption font-bold text-accent-secondary">18+</span>
                Min Age: {game.min_age}
              </div>
            ) : null}
            {game.is_money_game ? (
              <div className="flex items-center text-body text-text-secondary">
                <span className="w-4 h-4 mr-2 text-center text-caption font-bold text-success">💰</span>
                Entry: ${game.entry_fee || 0} | Pot: ${game.total_pot || 0}
              </div>
            ) : null}
          </div>

            {participants.length >= game.max_players && (
              <div className="card border-success/50 bg-success/10">
                <p className="text-body text-success">🎉 Game is full! Ready to start playing!</p>
              </div>
            )}
          </div>
        </div>

        {/* Two-column layout for participants and chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participants Section */}
          <div className="card" style={{ backdropFilter: 'blur(12px)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-2 text-text-primary">Players ({participants.length})</h2>
              <div className="flex items-center text-caption text-text-muted">
                <UserPlus className="w-4 h-4 mr-1" />
                {participants.length === 0 ? 'No players yet' : `${participants.length} joined`}
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-16 w-16 text-text-muted mb-4" />
                <p className="text-body text-text-secondary">No players have joined yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className="p-4 bg-surface/40 backdrop-blur-sm rounded-card border border-border-subtle/30 hover:bg-surface/60 hover:border-accent-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      {/* Avatar - Clickable */}
                      <div
                        className="flex-shrink-0 w-14 h-14 bg-accent-primary/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-accent-primary/30 transition-all"
                        onClick={() => viewUserProfile(participant.id)}
                      >
                        <span className="text-heading-2 text-accent-primary font-bold">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* User Info - Clickable */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => viewUserProfile(participant.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-heading-3 text-text-primary hover:text-accent-primary transition-colors truncate">
                            {participant.username}
                          </p>
                          {index === 0 && (
                            <span className="chip chip-active text-[10px] px-2 py-0.5">
                              Host
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-text-muted">
                          Joined {formatDate(participant.joined_at)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {user && participant.id !== user.id && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {!friends.includes(participant.id) ? (
                          <button
                            onClick={() => sendFriendRequest(participant.id)}
                            className="chip hover:bg-accent-primary/10 hover:border-accent-primary hover:text-accent-primary transition-all duration-150 flex items-center gap-1"
                            title="Add as friend"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Add Friend</span>
                          </button>
                        ) : (
                          <span className="chip bg-success/20 border-success/50 text-success flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span>Friend</span>
                          </span>
                        )}
                        <button
                          onClick={() => openReportModal(participant)}
                          className="chip hover:bg-error/10 hover:border-error hover:text-error transition-all duration-150 flex items-center gap-1"
                          title="Report player"
                        >
                          <Flag className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div>
            <Chat gameId={gameId!} socket={socket} />
          </div>
        </div>
      </div>
      {/* Complete Game Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg border-accent-primary/30">
            <h2 className="text-heading-2 text-text-primary mb-6">Complete Game: Enter Team Scores</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              
              // Validate scores
              const homeScore = parseInt(results.homeScore);
              const awayScore = parseInt(results.awayScore);
              
              if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
                window.alert('Please enter valid scores (non-negative numbers)');
                return;
              }
              
              const apiBaseUrl = getApiBaseUrl();
              const payload = {
                homeScore,
                awayScore
              };
              try {
                const response = await fetch(`${apiBaseUrl}/api/games/${gameId}/complete`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                  },
                  body: JSON.stringify({ results: payload })
                });
                if (response.ok) {
                  setShowCompleteModal(false);
                  window.alert('Game completed and results saved!');
                  navigate('/');
                } else {
                  const error = await response.json();
                  window.alert(error.error || 'Failed to complete game');
                }
              } catch (err) {
                window.alert('Failed to complete game');
              }
            }}>
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex-1">
                    <label className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">Home Team Score</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={results.homeScore}
                      onChange={e => setResults(r => ({...r, homeScore: e.target.value}))}
                      className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-heading-2 text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                      required
                      min="0"
                    />
                  </div>
                  <div className="text-heading-2 font-bold text-text-muted">vs</div>
                  <div className="flex-1">
                    <label className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">Away Team Score</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={results.awayScore}
                      onChange={e => setResults(r => ({...r, awayScore: e.target.value}))}
                      className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-heading-2 text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                      required
                      min="0"
                    />
                  </div>
                </div>
                <div className="text-center text-body text-text-secondary mt-4">
                  Final Score: {results.homeScore || '0'} - {results.awayScore || '0'}
                </div>
              </div>
              <div className="flex justify-end mt-6 space-x-3 pt-6 border-t border-divider">
                <button type="button" onClick={() => setShowCompleteModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Submit Results</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Player Modal */}
      {showReportModal && reportingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg border-error/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-2 text-text-primary">Report Player: {reportingUser.username}</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-text-muted hover:text-text-primary transition-all duration-150"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              submitReport();
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                    Reason for Report *
                  </label>
                  <select
                    value={reportData.reason}
                    onChange={(e) => setReportData(prev => ({...prev, reason: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
                    required
                  >
                    <option value="">Select a reason</option>
                    <option value="inappropriate_behavior">Inappropriate Behavior</option>
                    <option value="harassment">Harassment</option>
                    <option value="cheating">Cheating</option>
                    <option value="unsportsmanlike_conduct">Unsportsmanlike Conduct</option>
                    <option value="no_show">No Show</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                    Additional Details (Optional)
                  </label>
                  <textarea
                    value={reportData.description}
                    onChange={(e) => setReportData(prev => ({...prev, description: e.target.value}))}
                    placeholder="Please provide additional details about the incident..."
                    className="w-full px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-all duration-150"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3 pt-6 border-t border-divider">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-destructive"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Game Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg border-accent-primary/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-2 text-text-primary">Share Game</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-text-muted hover:text-text-primary transition-all duration-150"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-caption text-text-secondary mb-2 uppercase tracking-wider">
                  Game Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={getShareLink()}
                    readOnly
                    className="flex-1 px-4 py-3 bg-app border border-border-subtle rounded-card text-body text-text-primary"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn-secondary text-caption px-4 py-2"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div className="card bg-app">
                <h3 className="text-heading-3 text-text-primary mb-3">Game Details</h3>
                <div className="text-body text-text-secondary space-y-2">
                  <p><strong className="text-text-primary">Title:</strong> {game?.title}</p>
                  <p><strong className="text-text-primary">Sport:</strong> {game?.sport}</p>
                  <p><strong className="text-text-primary">Location:</strong> {game?.location}</p>
                  <p><strong className="text-text-primary">Players:</strong> {participants.length}/{game?.max_players}</p>
                </div>
              </div>
              
              <div className="text-body text-text-secondary">
                <p>Share this link with friends to invite them to join the game!</p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6 pt-6 border-t border-divider">
              <button
                onClick={() => setShowShareModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfileModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
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

export default GameLobby; 