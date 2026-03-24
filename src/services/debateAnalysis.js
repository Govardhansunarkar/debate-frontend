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
    console.log('[getDebateFeedback] 🚀 Requesting LLM analysis for:', {
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

    console.log('[getDebateFeedback] 📝 Formatted speeches:', formattedSpeeches.length);

    // Call the NVIDIA LLM-powered analysis endpoint
    const response = await axios.post(`${API_URL}/debates/analyze-openai`, {
      speeches: formattedSpeeches,
      topic: topic,
    });

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
    const source = complexFeedback?.openai?.source;
    const isGenuineLLM = complexFeedback?.openai?.isGenuineLLM;
    const warning = complexFeedback?.openai?.warning;
    
    console.log('[simplifyFeedback] Processing feedback with source:', source, '| Genuine LLM:', isGenuineLLM);
    
    if (!analysis) {
      // Return default feedback if analysis is missing
      return {
        overall_score: calculateSimpleScore(speeches),
        strengths: [
          "You expressed your ideas clearly",
          "You participated actively in the debate",
          "You provided thoughtful arguments",
          "Good effort for your first debate!"
        ],
        improvements: [
          "Try using more specific examples and statistics",
          "Build on the AI's points directly when disagreeing",
          "Practice speaking at a steady pace",
          "Add more logical connections between your points"
        ],
        source: source || 'UNKNOWN',
        isGenuineLLM: false,
        warning: warning
      };
    }

    // Extract score (convert 0-10 scale to ensure it's a number)
    let score = 7; // Default
    if (analysis.overall_score !== undefined) {
      score = Math.round(analysis.overall_score);
    } else if (analysis.score !== undefined) {
      score = Math.round(analysis.score);
    }

    // Extract strengths
    let strengths = [];
    if (Array.isArray(analysis.strengths)) {
      strengths = analysis.strengths.slice(0, 5);
    } else if (analysis.strengths && typeof analysis.strengths === 'object') {
      strengths = Object.values(analysis.strengths).slice(0, 5);
    } else if (typeof analysis.strengths === 'string') {
      strengths = analysis.strengths.split('\n').filter(s => s.trim()).slice(0, 5);
    }

    // Extract improvements/recommendations
    let improvements = [];
    if (Array.isArray(analysis.recommendations)) {
      improvements = analysis.recommendations.slice(0, 5);
    } else if (Array.isArray(analysis.improvements)) {
      improvements = analysis.improvements.slice(0, 5);
    } else if (analysis.recommendations && typeof analysis.recommendations === 'object') {
      improvements = Object.values(analysis.recommendations).slice(0, 5);
    } else if (typeof analysis.recommendations === 'string') {
      improvements = analysis.recommendations.split('\n').filter(i => i.trim()).slice(0, 5);
    }

    return {
      overall_score: score,
      strengths: strengths.length > 0 ? strengths : [
        "You expressed your ideas clearly",
        "You participated actively in the debate",
        "Good effort in your debate performance!"
      ],
      improvements: improvements.length > 0 ? improvements : [
        "Try using more specific examples and statistics",
        "Build on the AI's points directly when disagreeing",
        "Add more logical connections between your points"
      ],
      source: source || 'UNKNOWN',
      isGenuineLLM: isGenuineLLM !== false ? true : false,
      warning: warning
    };
  } catch (error) {
    console.error('[simplifyFeedback] Error simplifying feedback:', error);
    return {
      overall_score: 7,
      strengths: [
        "You participated in the debate",
        "You expressed your thoughts",
        "Great effort!"
      ],
      improvements: [
        "Use more specific examples",
        "Practice regular debates to improve",
        "Focus on logical arguments"
      ],
      source: 'ERROR',
      isGenuineLLM: false
    };
  }
};

// Calculate a simple score based on speeches
const calculateSimpleScore = (speeches = []) => {
  if (!speeches || speeches.length === 0) return 5;
  
  let score = 6;
  
  // Add points for number of speeches
  if (speeches.length >= 3) score += 1;
  if (speeches.length >= 5) score += 1;
  
  // Add points for average speech quality
  const avgPoints = speeches.reduce((sum, s) => sum + (s.points || 0), 0) / speeches.length;
  if (avgPoints > 25) score += 1;
  if (avgPoints > 30) score += 1;
  
  return Math.min(10, score);
};
