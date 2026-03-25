import axios from "axios";

// Use localhost for development, production URL for production
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
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
      ? 'http://localhost:8000/api'
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

    // Call the NVIDIA LLM-powered analysis endpoint with increased timeout for production
    // NVIDIA API can take 30-60 seconds to generate quality feedback
    let response;
    let retries = 0;
    const maxRetries = 2;
    
    while (retries <= maxRetries) {
      try {
        console.log(`[getDebateFeedback] 📡 Calling AI analysis API (attempt ${retries + 1}/${maxRetries + 1})...`);
        response = await axios.post(`${currentAPI_URL}/debates/analyze-openai`, {
          speeches: formattedSpeeches,
          topic: topic,
        }, {
          timeout: 60000  // 60 seconds for NVIDIA API (was 20s, causing timeouts)
        });
        
        console.log('[getDebateFeedback] ✅ Response received successfully');
        break; // Success, exit retry loop
      } catch (error) {
        console.warn(`[getDebateFeedback] ⚠️ Attempt ${retries + 1} failed:`, error.message);
        
        retries++;
        if (retries > maxRetries) {
          throw error; // Throw after max retries
        }
        
        // Wait before retrying (exponential backoff)
        const delayMs = Math.min(1000 * Math.pow(2, retries), 10000);
        console.log(`[getDebateFeedback] ⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

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
      userMessage: error.code === 'ECONNABORTED' 
        ? 'Feedback is taking longer than expected. Please try again.'
        : 'Unable to load feedback. Please refresh and try again.'
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

// ⚡ Quick fallback feedback generator - provides instant feedback if API is slow
export const generateQuickFeedback = (speeches) => {
  // Generate basic feedback instantly without waiting for NVIDIA API
  const metrics = trackDebateMetrics(speeches);
  
  const strengths = [];
  const weaknesses = [];
  const improvements = [];

  // Analyze speech patterns
  speeches.forEach((speech, idx) => {
    if (speech?.points > 50) strengths.push(`Strong argument in turn ${idx + 1}`);
    if (speech?.wordCount > 150) strengths.push(`Good elaboration with ${speech.wordCount} words`);
    if (speech?.wordCount < 20) weaknesses.push(`Turn ${idx + 1} was too brief`);
    if (speech?.duration < 3) improvements.push(`Speak longer to build stronger arguments`);
  });

  return {
    success: true,
    openai: {
      analysis: {
        summary: `Great job! You delivered ${metrics.totalSpeeches} speeches with ${metrics.totalPoints} total points.`,
        strengths: strengths.length > 0 ? strengths : ["Participated in debate"],
        weaknesses: weaknesses.length > 0 ? weaknesses : ["None noticed"],
        improvements: improvements.length > 0 ? improvements : ["Keep practicing!"],
        overallScore: Math.min(95, Math.round((metrics.totalPoints / metrics.totalSpeeches) * 2))
      },
      source: "QUICK_FALLBACK",
      isGenuineLLM: false,
      warning: "Quick feedback generated - AI analysis still loading in background"
    }
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
