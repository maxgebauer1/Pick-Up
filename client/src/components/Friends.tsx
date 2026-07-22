import React, { useState } from 'react';
import { Search, UserPlus, UserCheck, UserX, Users, Clock } from 'lucide-react';
import { getApiBaseUrl } from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  age?: number;
  location?: string;
  created_at: string;
}

interface Friend extends User {
  status?: string;
  friendship_date?: string;
  request_date?: string;
}

const Friends: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const apiBaseUrl = getApiBaseUrl();

  const fetchFriends = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends/pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ friendId })
      });
      
      if (response.ok) {
        setMessage('Friend request sent successfully!');
        setSearchResults([]);
        setSearchQuery('');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to send friend request');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Failed to send friend request');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const acceptFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ friendId })
      });
      
      if (response.ok) {
        setMessage('Friend request accepted!');
        fetchFriends();
        fetchPendingRequests();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Failed to accept friend request');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const rejectFriendRequest = async (friendId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ friendId })
      });
      
      if (response.ok) {
        setMessage('Friend request rejected');
        fetchPendingRequests();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Failed to reject friend request');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        setMessage('Friend removed successfully');
        fetchFriends();
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Failed to remove friend');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchUsers(searchQuery);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-heading-1 text-text-primary">Friends</h1>
        <p className="mt-2 text-body text-text-secondary">Manage your friends and find new players</p>
      </div>

      {message && (
        <div className="mb-6 bg-accent-primary/20 border border-accent-primary/50 text-text-primary px-4 py-3 rounded-card">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Search Users */}
        <div className="bg-surface/80 backdrop-blur-md rounded-card border border-border-subtle/50 p-6">
          <h2 className="text-heading-3 text-text-primary mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2 text-accent-secondary" />
            Find Players
          </h2>
          
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username..."
                className="flex-1 px-4 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
              />
              <button
                type="submit"
                disabled={loading || searchQuery.length < 2}
                className="ml-2 px-6 py-2.5 bg-accent-secondary text-text-primary rounded-card hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-smooth">
                  <div>
                    <div className="font-medium text-body text-text-primary">{user.username}</div>
                    <div className="text-caption text-text-secondary">{user.email}</div>
                    {user.location && (
                      <div className="text-caption text-text-muted">{user.location}</div>
                    )}
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="flex items-center px-3 py-1.5 bg-success text-text-primary text-caption rounded-pill hover:opacity-90 transition-all duration-200 font-medium"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="bg-surface/80 backdrop-blur-md rounded-card border border-border-subtle/50 p-6">
          <h2 className="text-heading-3 text-text-primary mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-accent-secondary" />
            Pending Requests ({pendingRequests.length})
          </h2>
          
          {pendingRequests.length === 0 ? (
            <p className="text-body text-text-secondary">No pending friend requests</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-smooth">
                  <div>
                    <div className="font-medium text-body text-text-primary">{request.username}</div>
                    <div className="text-caption text-text-secondary">{request.email}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => acceptFriendRequest(request.id)}
                      className="flex items-center px-3 py-1.5 bg-success text-text-primary text-caption rounded-pill hover:opacity-90 transition-all duration-200 font-medium"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => rejectFriendRequest(request.id)}
                      className="flex items-center px-3 py-1.5 bg-error text-text-primary text-caption rounded-pill hover:opacity-90 transition-all duration-200 font-medium"
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Friends List */}
      <div className="mt-8 bg-surface/80 backdrop-blur-md rounded-card border border-border-subtle/50 p-6">
        <h2 className="text-heading-3 text-text-primary mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-accent-secondary" />
          My Friends ({friends.length})
        </h2>
        
        {friends.length === 0 ? (
          <p className="text-body text-text-secondary">You haven't added any friends yet. Search for players to add them!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-smooth p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-body text-text-primary">{friend.username}</div>
                    <div className="text-caption text-text-secondary">{friend.email}</div>
                    {friend.location && (
                      <div className="text-caption text-text-muted">{friend.location}</div>
                    )}
                    {friend.friendship_date && (
                      <div className="text-caption text-text-muted mt-1">
                        Friends since {new Date(friend.friendship_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFriend(friend.id)}
                    className="flex items-center px-2 py-1 bg-error text-text-primary text-caption rounded-pill hover:opacity-90 transition-all duration-200 ml-2 font-medium"
                  >
                    <UserX className="w-3 h-3 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends; 