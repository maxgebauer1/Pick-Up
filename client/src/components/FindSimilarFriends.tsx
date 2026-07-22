import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/api';
import { MapPin, Users, Trophy, UserPlus, Navigation } from 'lucide-react';

interface SimilarFriend {
  id: string;
  username: string;
  email: string;
  age: number | null;
  current_location: string | null;
  home_location: string | null;
  favorite_sport: string | null;
  profile_pic: string | null;
  distance: number;
}

const FindSimilarFriends: React.FC = () => {
  const [friends, setFriends] = useState<SimilarFriend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState('');

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationError('');
        fetchSimilarFriends(latitude, longitude);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError('Unable to get your location. Please enable location services.');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const fetchSimilarFriends = async (lat: number, lng: number) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      
      // Convert 20 miles to kilometers for backend (1 mile = 1.609344 km)
      const radiusInKm = 20 * 1.609344;
      const response = await fetch(`${apiBaseUrl}/api/friends/similar?lat=${lat}&lng=${lng}&radius=${radiusInKm}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to find similar friends');
      }
    } catch (error) {
      console.error('Error fetching similar friends:', error);
      setError('Failed to find similar friends');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ friendId })
      });

      if (response.ok) {
        // Update the friends list to show that request was sent
        setFriends(prev => prev.map(friend => 
          friend.id === friendId 
            ? { ...friend, friendRequestSent: true }
            : friend
        ));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setError('Failed to send friend request');
    }
  };

  if (locationError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
          <h2 className="text-heading-2 text-text-primary mb-4 flex items-center">
            <Users className="w-6 h-6 mr-2 text-accent-secondary" />
            Find Similar Friends
          </h2>
          <div className="bg-error/20 border border-error/50 text-text-primary px-4 py-3 rounded-md">
            {locationError}
          </div>
          <button
            onClick={getCurrentLocation}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-card text-text-primary bg-accent-secondary hover:opacity-90 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-surface/80 backdrop-blur-md bg-opacity-90 backdrop-blur-md rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading-2 text-text-primary flex items-center">
            <Users className="w-6 h-6 mr-2 text-accent-secondary" />
            Find Similar Friends
          </h2>
          <button
            onClick={() => getCurrentLocation()}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-card text-text-primary bg-accent-secondary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        <p className="text-body text-text-secondary mb-6">
          Find people within 20 miles who share your favorite sport!
        </p>

        {error && (
          <div className="mb-6 bg-error/20 border border-error/50 text-text-primary px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-secondary"></div>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Users className="mx-auto h-12 w-12 text-text-muted mb-4" />
            <p>No similar friends found in your area</p>
            <p className="text-caption">Make sure you have set your favorite sport and location in your profile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-surface/60 backdrop-blur-sm rounded-smooth p-4 border border-border-subtle/50 hover:bg-surface/80 hover:border-accent-secondary/30 transition-all duration-200">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center border border-border-subtle/50">
                    {friend.profile_pic ? (
                      <img 
                        src={friend.profile_pic} 
                        alt={friend.username} 
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-heading-3 text-text-primary truncate">
                      {friend.username}
                    </h3>
                    
                    {friend.age && (
                      <p className="text-caption text-text-secondary">Age: {friend.age}</p>
                    )}
                    
                    <div className="flex items-center text-caption text-text-muted mb-2">
                      <Trophy className="w-4 h-4 mr-1" />
                      <span className="capitalize">{friend.favorite_sport}</span>
                    </div>
                    
                    <div className="flex items-center text-caption text-text-secondary mb-2">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="truncate">
                        {friend.current_location || friend.home_location || 'Location not set'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-caption text-accent-secondary mb-3">
                      <Navigation className="w-4 h-4 mr-1" />
                      <span>{(friend.distance / 1.609344).toFixed(1)} miles away</span>
                    </div>
                    
                    <button
                      onClick={() => sendFriendRequest(friend.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add Friend
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindSimilarFriends;
