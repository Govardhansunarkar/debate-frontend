import api from './api';

export const debateService = {
  startDebate: async (roomCode, debateData) => {
    try {
      const response = await api.post(`/debates/${roomCode}/start`, debateData);
      return response.data;
    } catch (error) {
      console.debug('[debateService] startDebate error:', error.message);
      return null;
    }
  },

  endDebate: async (roomCode) => {
    try {
      const response = await api.post(`/debates/${roomCode}/end`, {});
      return response.data;
    } catch (error) {
      console.debug('[debateService] endDebate error:', error.message);
      return null;
    }
  },

  getDebateHistory: async (userId) => {
    try {
      const response = await api.get(`/debates/history/${userId}`);
      return response.data;
    } catch (error) {
      console.debug('[debateService] getDebateHistory error:', error.message);
      return null;
    }
  },

  getDebateResults: async (debateId) => {
    try {
      const response = await api.get(`/debates/${debateId}/results`);
      return response.data;
    } catch (error) {
      console.debug('[debateService] getDebateResults error:', error.message);
      return null;
    }
  },
};
