import api from './api';

export const roomService = {
  createRoom: async (roomData) => {
    try {
      const response = await api.post('/rooms', roomData);
      return response.data;
    } catch (error) {
      console.debug('[roomService] createRoom error:', error.message);
      return null;
    }
  },

  joinRoom: async (roomCode) => {
    try {
      const response = await api.post(`/rooms/${roomCode}/join`, {});
      return response.data;
    } catch (error) {
      console.debug('[roomService] joinRoom error:', error.message);
      return null;
    }
  },

  leaveRoom: async (roomCode) => {
    try {
      const response = await api.post(`/rooms/${roomCode}/leave`, {});
      return response.data;
    } catch (error) {
      console.debug('[roomService] leaveRoom error:', error.message);
      return null;
    }
  },

  getRoom: async (roomCode) => {
    try {
      const response = await api.get(`/rooms/${roomCode}`);
      return response.data;
    } catch (error) {
      console.debug('[roomService] getRoom error:', error.message);
      return null;
    }
  },

  getAvailableRooms: async () => {
    try {
      const response = await api.get('/rooms');
      return response.data;
    } catch (error) {
      console.debug('[roomService] getAvailableRooms error:', error.message);
      return null;
    }
  },
};
