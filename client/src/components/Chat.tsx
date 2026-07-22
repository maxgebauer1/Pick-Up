import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBaseUrl } from '../utils/api';

interface ChatMessage {
  id: string;
  message: string;
  user_id: string;
  username: string;
  created_at: string;
}

interface ChatProps {
  gameId: string;
  socket: any;
}

const Chat: React.FC<ChatProps> = ({ gameId, socket }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/games/${gameId}/chat`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Listen for new messages
    if (socket) {
      socket.on('newMessage', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
      });
    }

    return () => {
      if (socket) {
        socket.off('newMessage');
      }
    };
  }, [gameId, socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('sendMessage', {
      gameId,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="bg-surface/80 backdrop-blur-md rounded-card border border-border-subtle/50 p-4 h-96">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-secondary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface/80 backdrop-blur-md rounded-card border border-border-subtle/50 h-96 flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-border-subtle/50">
        <MessageCircle className="w-5 h-5 text-accent-secondary mr-2" />
        <h3 className="text-heading-3 text-text-primary">Game Chat</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <MessageCircle className="mx-auto h-12 w-12 text-text-muted mb-4" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-smooth ${
                  message.user_id === user?.id
                    ? 'bg-accent-secondary text-text-primary'
                    : 'bg-surface/60 backdrop-blur-sm text-text-primary border border-border-subtle/50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-caption font-medium">
                    {message.user_id === user?.id ? 'You' : message.username}
                  </span>
                  <span className={`text-caption ${message.user_id === user?.id ? 'text-text-primary/80' : 'text-text-secondary'}`}>
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="text-body break-words">{message.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border-subtle/50">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 bg-surface/40 backdrop-blur-sm border border-border-subtle/50 rounded-card text-body text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary/50 focus:bg-surface/60 transition-all duration-200"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2.5 bg-accent-secondary text-text-primary rounded-card hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat; 