import axios from "axios";

// Use localhost for development, production URL for production
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://debate-backend-paro.onrender.com/api';

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
    const currentAPI_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api'
      : 'https://debate-backend-paro.onrender.com/api';
    
    console.log('[getDebateFeedback] 🚀 Requesting LLM analysis for:', {
      debateId,
      topic,
      totalSpeeches: speeches?.length || 0,
      apiURL: currentAPI_URL
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

    console.log('[getDebateFeedback] 📝 Formatted speeches:', formattedSpeeches.length);

    console.log(`[getDebateFeedback] 📡 Calling AI analysis API (LLM only)...`);
    const response = await axios.post(`${currentAPI_URL}/debates/analyze-openai`, {
      speeches: formattedSpeeches,
      topic: topic,
    }, {
      timeout: 25000
    });

    console.log('[getDebateFeedback] ✅ Response received successfully');

    console.log('[getDebateFeedback] ✅ Response received:', {
      success: response.data?.success,
      source: response.data?.source,
      hasAnalysis: !!response.data?.analysis,
      warning: response.data?.warning
    });

    // The response should contain analysis from NVIDIA LLM
    if (response.data?.success && response.data?.analysis) {
      const isGenuineLLM = response.data?.source === 'NVIDIA_LLM';
      
      console.log(`[getDebateFeedback] ${isGenuineLLM ? '✅ GENUINE' : '⚠️ FALLBACK'} Feedback Source:`, response.data?.source);
      
      if (response.data?.warning) {
        console.warn('[getDebateFeedback] ⚠️ Warning:', response.data.warning);
      }
      
      return {
        success: true,
        openai: {
          analysis: response.data.analysis,
          source: response.data?.source || "UNKNOWN",
          isGenuineLLM: isGenuineLLM,
          warning: response.data?.warning
        },
        gemini: null,
        timestamp: response.data?.timestamp || new Date(),
      };
    } else {
      throw new Error('Invalid response format from LLM');
    }
  } catch (error) {
    console.error("[getDebateFeedback] ❌ Error getting LLM feedback:", error.message);
    
    // Log detailed error information for debugging
    if (error.response) {
      console.error("[getDebateFeedback] Response Status:", error.response.status);
      console.error("[getDebateFeedback] Response Data:", error.response.data);
    } else if (error.request) {
      console.error("[getDebateFeedback] No response from server - Network issue:", error.request);
    } else {
      console.error("[getDebateFeedback] Error details:", error);
    }
    
    return {
      success: false,
      error: error.message,
      isTimeout: error.code === 'ECONNABORTED',
      statusCode: error.response?.status,
      userMessage: error.response?.data?.error || 'Unable to load LLM feedback. Please check the backend and try again.'
    };
  }
};

// Track debate metrics
export const trackDebateMetrics = (speeches) => {
  if (!speeches || speeches.length === 0) {
    return {
      totalWords: 0,
      totalDuration: 0,
      totalPoints: 0,
      averageWordCount: 0,
      speeches: [],
    };
  }

  const metrics = speeches
    .filter((speech) => speech && speech.text) // Filter out invalid entries
    .map((speech) => ({
      ...speech,
      wordCount: (speech.text || "").split(" ").filter((w) => w).length,
      duration: speech.duration || 0,
      engine: speech.engine || "unknown", // Preserve engine information
      speaker: speech.speaker || "unknown",
      points: speech.points || 0,
    }));

  const totalWords = metrics.reduce((sum, s) => sum + s.wordCount, 0);
  const totalDuration = metrics.reduce((sum, s) => sum + s.duration, 0);
  const totalPoints = metrics.reduce((sum, s) => sum + s.points, 0);

  return {
    totalWords,
    totalDuration,
    totalPoints,
    averageWordCount: metrics.length > 0 ? Math.round(totalWords / metrics.length) : 0,
    totalSpeeches: metrics.length,
    speeches: metrics,
  };
};

// ⚡ Generate individual per-user feedback for multi-user debates
export const generatePerUserFeedback = (speeches, allPlayers = []) => {
  if (!speeches || speeches.length === 0) {
    return {};
  }

  // Get unique speakers
  const speakers = [...new Set(speeches.map(s => s.speaker).filter(s => s && s !== "ai"))];
  
  const userFeedback = {};

  speakers.forEach(playerName => {
    // Get this player's speeches
    const playerSpeeches = speeches.filter(s => s.speaker === playerName);
    
    if (playerSpeeches.length === 0) {
      return;
    }

    // Calculate metrics
    const totalWords = playerSpeeches.reduce((sum, s) => {
      const words = (s.text || "").split(" ").filter(w => w).length;
      return sum + words;
    }, 0);

    const totalPoints = playerSpeeches.reduce((sum, s) => sum + (s.points || 0), 0);
    const avgWordCount = Math.round(totalWords / playerSpeeches.length);
    const turnCount = playerSpeeches.length;
    const avgQuality = playerSpeeches.length > 0
      ? Math.round(playerSpeeches.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / playerSpeeches.length)
      : 0;

    // Analyze strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    const improvements = [];

    // Check for evidence-based arguments
    const evidenceCount = playerSpeeches.filter(s => {
      const text = (s.text || "").toLowerCase();
      return text.includes("study") || text.includes("research") || text.includes("data") || text.includes("fact");
    }).length;

    if (evidenceCount > turnCount / 2) {
      strengths.push("Uses evidence and data to support arguments");
    }

    if (avgWordCount > 100) {
      strengths.push(`Provides detailed responses (avg ${avgWordCount} words per turn)`);
    }

    if (avgQuality > 60) {
      strengths.push("Demonstrates strong logical reasoning");
    }

    if (avgWordCount < 30) {
      weaknesses.push("Responses are too brief - elaborate more");
    }

    if (avgQuality < 40) {
      weaknesses.push("Consider supporting arguments with evidence");
    }

    if (turnCount > 3) {
      improvements.push("Great participation! Keep engaging consistently");
    } else {
      improvements.push("Aim to contribute more turns in future debates");
    }

    const overallScore = Math.min(100, Math.round((totalPoints / turnCount + avgQuality) / 2));

    userFeedback[playerName] = {
      playerName,
      stats: {
        turns: turnCount,
        totalWords,
        totalPoints,
        avgWordCount,
        avgQuality,
      },
      analysis: {
        summary: `Great debate! You made ${turnCount} points with a score of ${overallScore}/100.`,
        strengths: strengths.length > 0 ? strengths : ["Participated actively"],
        weaknesses: weaknesses.length > 0 ? weaknesses : ["Keep improving"],
        improvements: improvements.length > 0 ? improvements : ["Practice makes perfect!"],
        overallScore
      }
    };
  });

  return userFeedback;
};

// Prepare debate transcript
export const prepareDebateTranscript = (playerName, speeches) => {
  if (!speeches || !Array.isArray(speeches)) {
    return [];
  }
  
  return speeches
    .filter((speech) => speech && speech.text) // Filter out invalid entries
    .map((speech, idx) => ({
      index: idx + 1,
      timestamp: speech.timestamp ? new Date(speech.timestamp).toLocaleTimeString() : "N/A",
      speaker: playerName,
      text: speech.text,
      wordCount: (speech.text || "").split(" ").filter((w) => w).length,
    }));
};

// Convert complex feedback to simple format for SimpleFeedback component
export const simplifyFeedback = (complexFeedback, speeches = []) => {
  try {
    const analysis = complexFeedback?.openai?.analysis;
    if (!analysis) {
      return {
        overall_score: Math.round(complexFeedback?.openai?.analysis?.overallScore || 0),
        strengths: ["No analysis returned from the backend"],
        improvements: ["Please try again after the backend finishes generating feedback"],
        summary: "LLM analysis is unavailable right now.",
        source: complexFeedback?.openai?.source || 'UNKNOWN',
        isGenuineLLM: complexFeedback?.openai?.isGenuineLLM !== false,
        warning: complexFeedback?.openai?.warning
      };
    }

    const normalizeList = (value) => {
      if (Array.isArray(value)) return value.filter((item) => String(item).trim()).slice(0, 5);
      if (typeof value === 'string') return value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 5);
      return [];
    };

    const strengths = normalizeList(analysis.strengths);
    const weaknesses = normalizeList(analysis.weaknesses);
    const improvements = normalizeList(analysis.recommendations || analysis.improvements);
    const overallScore = Number.isFinite(Number(analysis.overallScore))
      ? Number(analysis.overallScore)
      : Number(analysis.overall_score) || 0;

    return {
      overall_score: overallScore,
      summary: analysis.summary || analysis.overall_summary || "",
      strengths,
      weaknesses,
      recommendations: improvements,
      improvements,
      source: complexFeedback?.openai?.source || 'UNKNOWN',
      isGenuineLLM: complexFeedback?.openai?.isGenuineLLM !== false,
      warning: complexFeedback?.openai?.warning,
      strengths_paragraph: analysis.strengths_paragraph,
      improvement_paragraph: analysis.improvement_paragraph
    };
  } catch (error) {
    console.error('[simplifyFeedback] Error simplifying feedback:', error);
    return {
      overall_score: 0,
      strengths: ["Unable to format LLM feedback"],
      improvements: ["Try generating the result again"],
      source: 'ERROR',
      isGenuineLLM: false,
      warning: error.message
    };
  }
};
