import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const socket = io(API_URL, {
  autoConnect: true,
  transports: ['websocket'],
});

export default socket;
