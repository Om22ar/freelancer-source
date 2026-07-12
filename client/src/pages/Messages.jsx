import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { connectSocket, getSocket } from '../lib/socket';
import useAuthStore from '../store/authStore';

export default function Messages() {
  const user = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Connect socket on mount
  useEffect(() => {
    const socket = connectSocket();

    socket?.on('new_message', (message) => {
      if (message.contract_id === activeConversation?.contract_id) {
        setMessages((prev) => [...prev, message]);
      }
      // Update conversation list last message
      setConversations((prev) =>
        prev.map((c) =>
          c.contract_id === message.contract_id
            ? { ...c, lastMessage: { content: message.content, senderId: message.sender_id, createdAt: message.created_at } }
            : c
        )
      );
    });

    socket?.on('user_typing', ({ userId, contractId }) => {
      if (contractId === activeConversation?.contract_id && userId !== user?.id) {
        setTyping(userId);
      }
    });

    socket?.on('user_stopped_typing', ({ contractId }) => {
      if (contractId === activeConversation?.contract_id) {
        setTyping(null);
      }
    });

    socket?.on('messages_read', ({ contractId }) => {
      if (contractId === activeConversation?.contract_id) {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      }
    });

    return () => {
      socket?.off('new_message');
      socket?.off('user_typing');
      socket?.off('user_stopped_typing');
      socket?.off('messages_read');
    };
  }, [activeConversation, user]);

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        setConversations(data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/messages/conversations/${activeConversation.contract_id}`);
        setMessages(data.messages);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();

    // Join socket room
    const socket = getSocket();
    socket?.emit('join_conversation', activeConversation.contract_id);
    socket?.emit('mark_read', activeConversation.contract_id);

    return () => {
      socket?.emit('leave_conversation', activeConversation.contract_id);
    };
  }, [activeConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const socket = getSocket();
    socket?.emit('send_message', {
      contractId: activeConversation.contract_id,
      content: newMessage.trim()
    });

    setNewMessage('');
    socket?.emit('typing_stop', activeConversation.contract_id);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    const socket = getSocket();

    socket?.emit('typing_start', activeConversation.contract_id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing_stop', activeConversation.contract_id);
    }, 2000);
  };

  const getOtherParty = (conv) => {
    if (user?.id === conv.client_id) {
      return { name: `${conv.freelancer_first_name} ${conv.freelancer_last_name}`, avatar: conv.freelancer_avatar };
    }
    return { name: `${conv.client_first_name} ${conv.client_last_name}`, avatar: conv.client_avatar };
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading messages...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 h-[calc(100vh-80px)]">
      <div className="flex h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Conversation list */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">No conversations yet</p>
            ) : (
              conversations.map((conv) => {
                const other = getOtherParty(conv);
                const isActive = activeConversation?.contract_id === conv.contract_id;
                return (
                  <div
                    key={conv.contract_id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition ${
                      isActive ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {other.avatar ? (
                        <img src={other.avatar} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-medium text-gray-600 text-sm">
                          {other.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm truncate">{other.name}</span>
                          {conv.unreadCount > 0 && (
                            <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.job_title}</p>
                        {conv.lastMessage && (
                          <p className="text-xs text-gray-400 truncate mt-1">{conv.lastMessage.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a conversation to start messaging
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <div>
                  <h3 className="font-semibold">{getOtherParty(activeConversation).name}</h3>
                  <p className="text-xs text-gray-500">{activeConversation.job_title}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMine ? 'order-2' : ''}`}>
                        {!isMine && (
                          <p className="text-xs text-gray-500 mb-1">{msg.first_name}</p>
                        )}
                        <div className={`px-4 py-3 rounded-2xl ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className={`text-xs mt-1 ${isMine ? 'text-right' : ''} text-gray-400`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
