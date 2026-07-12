import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

let socket = null;

export const connectSocket = () => {
  const token = useAuthStore.getState().token;
  if (!token || socket?.connected) return socket;

  const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  socket = io(serverUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
    if (err.message === 'Invalid token') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default { connectSocket, getSocket, disconnectSocket };
