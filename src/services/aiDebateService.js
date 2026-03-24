import axios from "axios";

// Auto-detect API URL - localhost for dev, Render for production
const API_URL = import.meta.env.MODE === 'development'
  ? 'http://localhost:8000/api'
  : 'https://debate-backend-paro.onrender.com/api';

console.log('[aiDebateService] Using API URL:', API_URL);

// Get AI response to user's argument with full debate context
export const getAIResponse = async (userSpeech, topic, debateContext) => {
  try {
    console.log('[aiDebateService] Starting getAIResponse');
    console.log('[aiDebateService] User Speech:', userSpeech);
    console.log('[aiDebateService] Topic:', topic);
    console.log('[aiDebateService] Debate Context:', debateContext);
    
    // Format debate context to include both player and AI arguments
    let formattedContext = [];
    if (debateContext && Array.isArray(debateContext)) {
      formattedContext = debateContext.map((item, idx) => ({
        text: item?.text || item || "",
        speaker: item?.playerName || (idx % 2 === 0 ? "Player" : "AI"),
        timestamp: item?.timestamp || new Date()
      }));
    }
    
    const requestPayload = {
      userArgument: userSpeech,
      topic: topic,
      debateContext: formattedContext
    };
    
    console.log('[aiDebateService] Request Payload:', JSON.stringify(requestPayload, null, 2));
    console.log('[aiDebateService] Calling endpoint:', `${API_URL}/debates/ai-response`);
    
    const response = await axios.post(`${API_URL}/debates/ai-response`, requestPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000  // 60 second timeout - increased to account for NVIDIA unlimited wait time
    });
    
    console.log('[aiDebateService] Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error("[aiDebateService] ERROR - Full error object:", error);
    console.error("[aiDebateService] Error message:", error.message);
    if (error.response) {
      console.error("[aiDebateService] Error response status:", error.response.status);
      console.error("[aiDebateService] Error response data:", error.response.data);
    } else if (error.request) {
      console.error("[aiDebateService] No response received - request error:", error.request);
    }
    
    return {
      success: false,
      error: error.message,
      response: "Sorry, I couldn't generate a response. Please try again."
    };
  }
};

// QUALITY-BASED SCORING - Score by meaning, not length!
export const calculateDebatePoints = (speechText) => {
  if (!speechText || speechText.trim().length === 0) {
    return 0;
  }

  const text = String(speechText).toLowerCase();
  const words = speechText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  let score = 0;
  const details = {
    hasEvidence: false,
    hasLogic: false,
    addressesCounterpoint: false,
    hasSpecificExamples: false,
    hasAcademicTone: false,
    wordCount: wordCount
  };

  // 1. EVIDENCE & DATA (0-25 points)
  const evidenceKeywords = [
    "study", "research", "data", "statistics", "found", "shows",
    "evidence", "fact", "report", "survey", "analysis", "%",
    "research shows", "scientists", "proved", "demonstrated"
  ];
  const hasEvidence = evidenceKeywords.some(kw => text.includes(kw));
  if (hasEvidence) {
    score += 15; // Significant boost for using evidence
    details.hasEvidence = true;
  }

  // 2. LOGICAL STRUCTURE (0-20 points)
  const logicKeywords = [
    "therefore", "because", "leads to", "results in", "causes",
    "implies", "conclusion", "reason", "consequent", "as a result",
    "ultimately", "this means", "so that"
  ];
  const hasLogic = logicKeywords.some(kw => text.includes(kw));
  if (hasLogic) {
    score += 12; // Good bonus for logical structure
    details.hasLogic = true;
  }

  // 3. ADDRESSES COUNTERPOINTS (0-20 points)
  const counterKeywords = [
    "however", "but", "although", "yet", "conversely", "despite",
    "on the other hand", "alternatively", "agreed", "you make a point",
    "you're right", "granted", "true, but", "actually", "in reality"
  ];
  const hasCounter = counterKeywords.some(kw => text.includes(kw));
  if (hasCounter) {
    score += 15; // Strong bonus for engaging with opposing view
    details.addressesCounterpoint = true;
  }

  // 4. SPECIFIC EXAMPLES (0-15 points)
  const exampleKeywords = [
    "example", "for instance", "such as", "specifically",
    "like", "happened", "occurred", "year", "study:",
    "case", "when", "instance", "demonstrated by"
  ];
  const hasExamples = exampleKeywords.some(kw => text.includes(kw));
  if (hasExamples) {
    score += 10; // Good bonus for specificity
    details.hasSpecificExamples = true;
  }

  // 5. ACADEMIC/FORMAL TONE (0-10 points)
  const academicKeywords = [
    "furthermore", "moreover", "perspective", "framework", "critical",
    "fundamental", "comprehensive", "impact", "significant", "substantial"
  ];
  const hasAcademic = academicKeywords.some(kw => text.includes(kw));
  if (hasAcademic) {
    score += 5;
    details.hasAcademicTone = true;
  }

  // 6. LENGTH APPROPRIATENESS - MINIMAL IMPACT (0-5 points)
  // Sweet spot: 20-80 words (meaningful but not rambling)
  if (wordCount >= 15 && wordCount <= 80) {
    score += 3; // Minimal bonus for good length
  } else if (wordCount >= 80 && wordCount <= 150) {
    score += 2; // Small bonus for longer but still coherent
  } else if (wordCount < 10) {
    // Penalty for too short
    score = Math.max(0, score - 5);
  }

  // 7. PENALTY FOR WEAK LANGUAGE (0-10 points deducted)
  const weakPatterns = [
    "i think", "i believe", "in my opinion", "i feel",
    "maybe", "sort of", "kind of", "like", "basically",
    "umm", "uh"
  ];
  let weakCount = 0;
  weakPatterns.forEach(pattern => {
    const regex = new RegExp(`\\b${pattern}\\b`, 'g');
    weakCount += (text.match(regex) || []).length;
  });
  const weakPenalty = Math.min(weakCount * 1.5, 10);
  score = Math.max(0, score - weakPenalty);

  // Final scoring brackets
  let finalScore = 0;
  if (score < 15) {
    finalScore = 2; // Minimal - mostly opinion
  } else if (score < 25) {
    finalScore = 8; // Low - some structure but weak
  } else if (score < 35) {
    finalScore = 15; // Medium - decent argument
  } else if (score < 45) {
    finalScore = 25; // Good - strong evidence/logic
  } else {
    finalScore = 35; // Excellent - comprehensive argument
  }

  return {
    points: Math.min(finalScore, 35), // Max 35 points per turn
    score: score,
    details: details,
    wordCount: wordCount
  };
};

// Track if speech is currently in progress to prevent concurrent utterances
let isSpeaking = false;
let currentUtterance = null;

// Text-to-Speech: Read AI response aloud with advanced options
export const speakText = (text, options = {}) => {
  return new Promise((resolve) => {
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.warn("[TTS] Speech Synthesis not supported in this browser");
      resolve();
      return;
    }

    try {
      // Prevent concurrent speech - don't start if already speaking
      if (isSpeaking && window.speechSynthesis.speaking) {
        console.warn("[TTS] Speech already in progress, queueing or skipping");
        resolve();
        return;
      }

      // Cancel any ongoing speech first
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        console.log("[TTS] Cancelled ongoing speech");
        isSpeaking = false;
      }

      // Wait a moment for cancellation to complete
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          currentUtterance = utterance;
          isSpeaking = true;
          
          // Configure speech parameters - optimized for clarity
          utterance.rate = options.rate || 0.9; // Slightly slower for clarity
          utterance.pitch = options.pitch || 1.0;
          utterance.volume = options.volume || 0.9; // Slightly lower to prevent clipping
          utterance.lang = options.lang || "en-US";

          // Try to select a good voice
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            // Prefer female voices (typically sound better)
            const femaleVoice = voices.find(v => 
              v.name.toLowerCase().includes('female') || 
              v.name.toLowerCase().includes('woman')
            );
            if (femaleVoice) {
              utterance.voice = femaleVoice;
              console.log("[TTS] Selected voice:", femaleVoice.name);
            } else {
              // Use first available voice
              utterance.voice = voices[0];
              console.log("[TTS] Selected voice:", voices[0].name);
            }
          }

          console.log("[TTS] Starting to speak:", text.substring(0, 60) + "...");
          console.log("[TTS] Config - Rate:", utterance.rate, "Pitch:", utterance.pitch, "Volume:", utterance.volume);

          let hasStarted = false;
          const startCheck = setTimeout(() => {
            if (!hasStarted) {
              console.warn("[TTS] Speech did not start within 500ms");
            }
          }, 500);

          utterance.onstart = () => {
            hasStarted = true;
            clearTimeout(startCheck);
            console.log("[TTS] ✓ Speech has started");
          };

          utterance.onend = () => {
            console.log("[TTS] ✓ Speech completed successfully");
            isSpeaking = false;
            currentUtterance = null;
            resolve();
          };

          utterance.onerror = (event) => {
            // Handle "interrupted" error gracefully - it's common when switching speeches
            if (event.error === 'interrupted') {
              console.log("[TTS] ℹ Speech was interrupted (expected - starting new speech)");
            } else {
              console.error("[TTS] ✗ Speech error:", event.error);
              console.log("[TTS] Details:", event);
            }
            // Always resolve to continue the debate
            isSpeaking = false;
            currentUtterance = null;
            resolve();
          };

          utterance.onpause = () => {
            console.log("[TTS] Speech paused");
          };

          utterance.onresume = () => {
            console.log("[TTS] Speech resumed");
          };

          // Speak the text
          window.speechSynthesis.speak(utterance);

          // Ultimate timeout - if speech takes longer than 120 seconds, force resolve
          const ultimateTimeout = setTimeout(() => {
            if (window.speechSynthesis.speaking) {
              console.warn("[TTS] Speech exceeded 120 seconds, stopping");
              window.speechSynthesis.cancel();
            }
            if (!hasStarted) {
              console.warn("[TTS] Resolving after timeout without starting");
            }
            isSpeaking = false;
            currentUtterance = null;
            resolve();
          }, 120000);

          // Attach timeout for future cleanup if needed
          utterance.timeoutId = ultimateTimeout;

        } catch (innerError) {
          console.error("[TTS] Error creating SpeechSynthesisUtterance:", innerError);
          isSpeaking = false;
          currentUtterance = null;
          resolve();
        }
      }, 50); // Small delay for cancellation to complete

    } catch (err) {
      console.error("[TTS] Unexpected error in speakText:", err);
      isSpeaking = false;
      currentUtterance = null;
      resolve();
    }
  });
};

// Stop any ongoing speech
export const stopSpeech = () => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log("[aiDebateService] Speech stopped");
    isSpeaking = false;
    currentUtterance = null;
  }
};
