import axios from "axios";

const API_URL = "https://ai-debate-arena-backend-9zur.onrender.com/api";

// Format duration in seconds to MM:SS or Ss format
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
};

// Get comprehensive debate feedback from NVIDIA LLM
export const getDebateFeedback = async (debateId, topic, speeches) => {
  try {
    console.log('[getDebateFeedback] Requesting LLM analysis for:', {
      debateId,
      topic,
      totalSpeeches: speeches?.length || 0
    });

    // Ensure we have speech data
    if (!speeches || speeches.length === 0) {
      throw new Error('No speeches to analyze');
    }

    // Format speeches for LLM analysis
    const formattedSpeeches = speeches.map((s, idx) => ({
      index: idx + 1,
      speaker: s.speaker || "unknown",
      text: s.text || "",
      engine: s.engine || "unknown",
      points: s.points || 0,
      duration: s.duration || 0
    }));

    console.log('[getDebateFeedback] Formatted speeches:', formattedSpeeches.length);

    // Call the NVIDIA LLM-powered analysis endpoint
    const response = await axios.post(`${API_URL}/debates/analyze-openai`, {
      speeches: formattedSpeeches,
      topic: topic,
    });

    console.log('[getDebateFeedback] LLM Response received:', response.data);

    // The response should contain analysis from NVIDIA LLM
    if (response.data?.success && response.data?.analysis) {
      return {
        success: true,
        openai: {
          analysis: response.data.analysis,
          source: "NVIDIA LLM"
        },
        gemini: null,
        timestamp: new Date(),
      };
    } else {
      throw new Error('Invalid response format from LLM');
    }
  } catch (error) {
    console.error("[getDebateFeedback] Error getting LLM feedback:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Track debate metrics
export const trackDebateMetrics = (speeches) => {
  if (!speeches || speeches.length === 0) {
    return {
      totalWords: 0,
      totalDuration: 0,
      averageWordCount: 0,
      speeches: [],
    };
  }

  const metrics = speeches.map((speech) => ({
    ...speech,
    wordCount: speech.text.split(" ").filter((w) => w).length,
    duration: speech.duration || 0,
    engine: speech.engine || "unknown", // Preserve engine information
    speaker: speech.speaker || "unknown",
    points: speech.points || 0,
  }));

  const totalWords = metrics.reduce((sum, s) => sum + s.wordCount, 0);
  const totalDuration = metrics.reduce((sum, s) => sum + s.duration, 0);

  return {
    totalWords,
    totalDuration,
    averageWordCount: Math.round(totalWords / metrics.length),
    totalSpeeches: metrics.length,
    speeches: metrics,
  };
};

// Prepare debate transcript
export const prepareDebateTranscript = (playerName, speeches) => {
  return speeches.map((speech, idx) => ({
    index: idx + 1,
    timestamp: new Date(speech.timestamp).toLocaleTimeString(),
    speaker: playerName,
    text: speech.text,
    wordCount: speech.text.split(" ").filter((w) => w).length,
  }));
};
