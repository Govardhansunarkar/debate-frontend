import api from './api';

export const aiService = {
  getAIFeedback: async (debateId) => {
    try {
      const response = await api.get(`/ai/feedback/${debateId}`);
      return response.data;
    } catch (error) {
      console.debug('[aiService] getAIFeedback error:', error.message);
      return null;
    }
  },

  getAISuggestions: async (debateId) => {
    try {
      const response = await api.get(`/ai/suggestions/${debateId}`);
      return response.data;
    } catch (error) {
      console.debug('[aiService] getAISuggestions error:', error.message);
      return null;
    }
  },

  startAIDebate: async (topic, position) => {
    try {
      const response = await api.post('/ai/debate', { topic, position });
      return response.data;
    } catch (error) {
      console.debug('[aiService] startAIDebate error:', error.message);
      return null;
    }
  },

  getAIScore: async (debateId) => {
    try {
      const response = await api.get(`/ai/score/${debateId}`);
      return response.data;
    } catch (error) {
      console.debug('[aiService] getAIScore error:', error.message);
      return null;
    }
  },
};
