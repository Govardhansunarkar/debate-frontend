import React, { useState, useEffect, useRef } from "react";
import { getAIResponse, speakText, stopSpeech, calculateDebatePoints } from "../services/aiDebateService";
import { Mic, MicOff, Volume2 } from "lucide-react";

const AdvancedSpeechRecognition = ({ isActive, debateId, topic, onSpeechEnd, socket, roomType = 'user-only' }) => {
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [debateHistory, setDebateHistory] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [aiPoints, setAiPoints] = useState(0);
  const [currentTurnPoints, setCurrentTurnPoints] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const listeningStartTimeRef = useRef(null);
  const silenceTimeoutRef = useRef(null);  // Auto-submit after 5s silence
  const inactivityTimeoutRef = useRef(null);  // AI counter-attack after 20s inactivity
  const lastActivityRef = useRef(Date.now());
  const noSpeechCounterRef = useRef(0);  // Retry counter for no-speech errors

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("[SpeechRecognition] Web Speech API not supported");
      alert("Speech Recognition not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening for longer phrases
    recognition.interimResults = true;
    recognition.lang = "en-US";
    
    // Increase abort time for better speech detection
    try {
      recognition.maxAlternatives = 1;
    } catch (e) {
      // Some browsers don't support this property
    }

    let interimTranscript = "";

    recognition.onstart = () => {
      console.log("[SpeechRecognition] Listening started...");
      listeningStartTimeRef.current = Date.now();
      setIsListening(true);
      setUserTranscript("");
      setSubmissionError(null);  // Clear any previous errors
      interimTranscript = "";
    };

    recognition.onresult = (event) => {
      interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          console.log("[SpeechRecognition] Final result:", transcript);
          finalTranscriptRef.current += transcript + " ";
        } else {
          console.log("[SpeechRecognition] Interim result:", transcript);
          interimTranscript += transcript;
        }
      }

      // Display combined final + interim transcript
      const displayText = finalTranscriptRef.current + interimTranscript;
      setUserTranscript(displayText);
    };

    recognition.onerror = (event) => {
      console.error("[SpeechRecognition] Error:", event.error);
      
      let errorMsg = "Speech error occurred";
      
      // Map error codes to user-friendly messages
      const errorMap = {
        "network": "🌐 Network error - Please check your internet connection",
        "no-speech": "🔇 No speech detected - Please speak louder",
        "audio-capture": "🎤 Microphone not accessible - Check browser permissions",
        "not-allowed": "❌ Microphone permission denied - Allow microphone in browser settings",
        "service-not-allowed": "🔒 Speech service not allowed in this context",
        "bad-grammar": "⚠️ Speech format not recognized - Try again",
        "net-timeout": "⏱️ Network timeout - Try again"
      };
      
      errorMsg = errorMap[event.error] || `Speech error: ${event.error}`;
      console.warn("[SpeechRecognition] Error message:", errorMsg);
      
      // Handle "no-speech" error - auto retry without showing error
      if (event.error === "no-speech") {
        noSpeechCounterRef.current++;
        console.log(`[SpeechRecognition] No-speech error count: ${noSpeechCounterRef.current}/2`);
        
        if (noSpeechCounterRef.current <= 2 && isActive) {
          // Auto-restart without showing error to user
          console.log("[SpeechRecognition] Auto-restarting speech recognition...");
          setTimeout(() => {
            if (isActive) {
              try {
                setIsListening(true);
                recognition.start();
              } catch (e) {
                console.error("[SpeechRecognition] Failed to restart:", e);
                setSubmissionError(errorMsg);
                setIsListening(false);
              }
            }
          }, 500); // Shorter retry delay for better UX
          return;
        } else {
          // Max retries exceeded, show error and reset
          setSubmissionError(errorMsg);
          setIsListening(false);
          noSpeechCounterRef.current = 0;
        }
      } else {
        // Other errors - show message and don't retry
        setSubmissionError(errorMsg);
        setIsListening(false);
        noSpeechCounterRef.current = 0;
      }
    };

    recognition.onend = async () => {
      console.log("[SpeechRecognition] Listening ended");
      setIsListening(false);

      // Calculate speech duration in seconds
      const speechDuration = listeningStartTimeRef.current 
        ? Math.round((Date.now() - listeningStartTimeRef.current) / 1000) 
        : 0;
      console.log("[SpeechRecognition] Speech duration:", speechDuration, "seconds");

      // If we have a final transcript, process it
      if (finalTranscriptRef.current.trim()) {
        const userSpeech = finalTranscriptRef.current.trim();
        console.log("[SpeechRecognition] Final speech captured:", userSpeech);
        
        // Show the speech immediately
        setUserTranscript(userSpeech);
        
        // Calculate points based on argument QUALITY, not length
        const scoreResult = calculateDebatePoints(userSpeech);
        const points = scoreResult.points;
        console.log("[SpeechRecognition] Points calculation:", scoreResult);
        setCurrentTurnPoints(points);

        // Emit to socket for other players
        if (socket && debateId) {
          socket.emit("user-speech", {
            debateId,
            userId: localStorage.getItem("userId"),
            playerName: localStorage.getItem("playerName") || "Anonymous",
            speech: userSpeech,
            points: points,
            qualityScore: scoreResult.score
          });
        }

        // Store in history with duration
        const newHistoryItem = {
          speaker: "user",
          text: userSpeech,
          points: points,
          qualityScore: scoreResult.score,
          timestamp: new Date(),
          duration: speechDuration
        };
        
        // Create updated history that includes this new item
        const updatedHistory = [...debateHistory, newHistoryItem];
        
        setDebateHistory(updatedHistory);
        setUserPoints(prev => prev + points);

        console.log("[SpeechRecognition] Calling parent callback onSpeechEnd");
        
        // Call parent callback so DebateRoom knows about the speech
        if (onSpeechEnd) {
          onSpeechEnd(newHistoryItem);
        }

        console.log("[SpeechRecognition] Room type:", roomType);
        
        // Only get AI response if this is an AI debate room AND debate is still active
        if (roomType === 'ai' && isActive) {
          console.log("[SpeechRecognition] AI Debate: Immediately calling handleAIResponse (no fixed delay)...");
          // INSTANT SUBMISSION - No 5 second delay, AI responds immediately for faster latency
          await handleAIResponse(userSpeech, updatedHistory);
          
          // Start inactivity timer - if user doesn't respond in 20-30 seconds, AI auto-counterattacks
          lastActivityRef.current = Date.now();
          if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
          
          inactivityTimeoutRef.current = setTimeout(async () => {
            console.log("[SpeechRecognition] ⏱️ User inactive for 20+ seconds - AI auto-counterattacking");
            if (isActive) {
              const autoCounterAttack = {
                speaker: "user",
                text: "[silence]",
                points: 0,
                timestamp: new Date(),
                duration: 0
              };
              const historyWithSilence = [...updatedHistory, autoCounterAttack];
              await handleAIResponse("[User has not responded for 20 seconds. Provide a counter-argument or summary.]", historyWithSilence);
            }
          }, 20000);  // 20 seconds of inactivity
        } else if (roomType === 'ai' && !isActive) {
          console.warn("[SpeechRecognition] ⏱️ Debate timeout! Not requesting AI response");
        } else {
          console.log("[SpeechRecognition] User-Only Debate: Tracking progress only, no AI response");
        }

        // Reset for next turn
        finalTranscriptRef.current = "";
        listeningStartTimeRef.current = null;
      } else {
        console.warn("[SpeechRecognition] No speech captured");
        setUserTranscript("🔇 Listening...");
        // Don't show error message if listening is still active
        if (!isListening) {
          setSubmissionError("🔇 No speech - Please speak clearly and try again");
        }
        listeningStartTimeRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Clear timers
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [debateId, socket, isActive, roomType]);

  // CLEANUP: When debate ends (isActive becomes false), stop all ongoing speech
  useEffect(() => {
    if (!isActive) {
      console.log("[SpeechRecognition] ⏱️ DEBATE ENDED - Stopping all speech and recognition");
      
      // Clear all timers
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      
      // Stop speech recognition immediately
      if (recognitionRef.current) {
        console.log("[SpeechRecognition] ⏱️ Aborting speech recognition");
        recognitionRef.current.abort();
      }
      
      // Stop any ongoing text-to-speech
      console.log("[SpeechRecognition] ⏱️ Stopping TTS");
      stopSpeech();
      
      // Clear any submission state
      setIsSubmitting(false);
      setIsAISpeaking(false);
      setIsListening(false);
    }
  }, [isActive]);

  // Handle AI Response Generation
  const handleAIResponse = async (userSpeech, currentDebateHistory) => {
    try {
      // CHECK IF DEBATE IS STILL ACTIVE - PREVENTS AI RESPONSE AFTER TIMEOUT
      if (!isActive) {
        console.warn("[SpeechRecognition] ⏱️ Debate has ended! Stopping AI response immediately");
        // Emergency stop
        setIsSubmitting(false);
        setIsAISpeaking(false);
        return;
      }

      setSubmissionError(null);
      setIsSubmitting(true);
      setIsAISpeaking(true);
      
      // Clear inactivity timer while AI is responding
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      
      console.log("[SpeechRecognition] Submitting to API:", userSpeech);
      console.log("[SpeechRecognition] Debate history length:", currentDebateHistory?.length);
      console.log("[SpeechRecognition] Full debate history:", JSON.stringify(currentDebateHistory, null, 2));

      const response = await getAIResponse(userSpeech, topic, currentDebateHistory);

      console.log("[SpeechRecognition] API Response received:", response);
      console.log("[SpeechRecognition] Response engine used:", response.engine);
      console.log("[SpeechRecognition] Response turn number:", response.turnNumber);

      if (response.success) {
        const aiText = response.response || "I have to respectfully disagree with your argument.";
        console.log("[SpeechRecognition] AI Response text:", aiText);
        setAiResponse(aiText);

        // Estimate AI speech duration based on word count
        // Average speaking rate is ~150 words per minute at normal speed
        // At 0.95 rate (slightly slower), estimate is: wordCount / 150 * 60
        const aiWordCount = aiText.split(" ").filter(w => w).length;
        const estimatedAiDuration = Math.round((aiWordCount / 150) * 60);
        console.log("[SpeechRecognition] AI text word count:", aiWordCount, "estimated duration:", estimatedAiDuration, "seconds");

        // Add to debate history with duration
        const aiHistoryItem = {
          speaker: "ai",
          text: aiText,
          points: response.points || 10,
          timestamp: new Date(),
          engine: response.engine,
          duration: estimatedAiDuration
        };
        
        setDebateHistory(prev => [
          ...prev,
          aiHistoryItem
        ]);

        // Call parent callback so DebateRoom knows about the AI response
        if (onSpeechEnd) {
          onSpeechEnd(aiHistoryItem);
        }

        if (response.points) {
          setAiPoints(prev => prev + response.points);
        }

        // Speak the AI response ONLY in AI debate rooms (not in user-only debates)
        // User-only debates use real voice from microphone via PeerJS, not TTS
        if (roomType === 'ai' && isActive) {
          console.log("[SpeechRecognition] Speaking AI response (AI Debate):", aiText);
          await speakText(aiText, { rate: 0.95, pitch: 1 });
          console.log("[SpeechRecognition] Speech completed successfully");
        } else if (roomType === 'ai' && !isActive) {
          console.log("[SpeechRecognition] ⏸️ Debate ended, skipping AI speech");
          stopSpeech();
        } else {
          console.log("[SpeechRecognition] 🎤 User-Only Debate: Skipping TTS (using real voice via WebRTC)");
        }
      } else {
        console.error("[SpeechRecognition] API returned error:", response.error);
        setSubmissionError(`Failed to get AI response: ${response.error}`);
        setAiResponse("Sorry, I couldn't generate a response. Please try again.");
      }
    } catch (error) {
      console.error("[SpeechRecognition] Error handling AI response:", error);
      setSubmissionError(`Error: ${error.message}`);
      setAiResponse("Sorry, something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
      setIsAISpeaking(false);
      console.log("[SpeechRecognition] handleAIResponse completed");
      
      // Restart inactivity timer after AI response completes
      // If user doesn't respond in next 20 seconds, AI will auto-counterattack again
      lastActivityRef.current = Date.now();
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      
      if (isActive && roomType === 'ai') {
        inactivityTimeoutRef.current = setTimeout(async () => {
          console.log("[SpeechRecognition] ⏱️ User inactive for another 20 seconds - AI auto-counterattacking again");
          if (isActive) {
            const autoCounterAttack = {
              speaker: "user",
              text: "[silence]",
              points: 0,
              timestamp: new Date(),
              duration: 0
            };
            await handleAIResponse("[User is still not responding after 20 seconds. Provide another counter-argument or closing statement.]", [...debateHistory, autoCounterAttack]);
          }
        }, 20000);
      }
    }
  };

  // Start listening
  const handleStartListening = () => {
    if (!isActive) {
      setSubmissionError("❌ Start the debate first!");
      return;
    }

    if (!recognitionRef.current) {
      setSubmissionError("❌ Speech Recognition not available in your browser");
      return;
    }

    console.log("[SpeechRecognition] 🎤 Checking microphone permissions...");
    setSubmissionError(null);
    noSpeechCounterRef.current = 0; // Reset retry counter
    
    // Clear old timers when starting new listening session
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);

    // Check for microphone permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        console.log("[SpeechRecognition] ✅ Microphone permission granted");
        // Stop the permission check stream
        stream.getTracks().forEach(track => track.stop());
        
        // Now start speech recognition
        finalTranscriptRef.current = "";
        setUserTranscript("");
        setIsListening(true);
        listeningStartTimeRef.current = Date.now();
        lastActivityRef.current = Date.now();
        
        recognitionRef.current.start();
        console.log("[SpeechRecognition] 🎯 Started listening...");
      })
      .catch(error => {
        console.error("[SpeechRecognition] ❌ Microphone permission error:", error);
        
        let errorMessage = "🎤 Microphone Permission Error";
        let errorDetail = "";
        
        if (error.name === 'NotAllowedError') {
          errorMessage = "❌ Permission Denied";
          errorDetail = "Click on the 🔒 lock icon in your address bar and enable microphone access";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "❌ Microphone Not Found";
          errorDetail = "Microphone is not connected or not detected by your browser";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "❌ Microphone In Use";
          errorDetail = "Another application is using your microphone. Close it and try again.";
        } else if (error.name === 'SecurityError') {
          errorMessage = "❌ Security Error";
          errorDetail = "This site is not allowed to access the microphone. Switch to HTTPS or check browser settings.";
        } else {
          errorDetail = error.message;
        }
        
        setSubmissionError(`${errorMessage}\n\n${errorDetail}`);
        setIsListening(false);
        
        console.error("[SpeechRecognition] Error details:", {
          name: error.name,
          message: error.message,
          code: error.code
        });
      });
  };

  // Stop listening
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Stop AI speech
  const handleStopAISpeech = () => {
    stopSpeech();
    setIsAISpeaking(false);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div className="w-full space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-purple-700">
          {roomType === 'ai' ? '🤖 Debate with AI' : '👥 Live Debate'}
        </h3>
        <div className="flex gap-2 text-sm font-bold">
          {roomType === 'ai' ? (
            <>
              <span className="bg-green-200 text-green-800 px-3 py-1 rounded">You: {userPoints} pts</span>
              <span className="bg-red-200 text-red-800 px-3 py-1 rounded">AI: {aiPoints} pts</span>
            </>
          ) : (
            <span className="bg-blue-200 text-blue-800 px-3 py-1 rounded">📊 Your Points: {userPoints} pts</span>
          )}
        </div>
      </div>

      {/* Your Speech Display */}
      <div className="bg-white rounded-lg p-3 border-2 border-green-300">
        <p className="text-sm font-semibold text-green-700 mb-2">You Speaking:</p>
        <p className={`text-sm leading-relaxed ${userTranscript ? "text-gray-800" : "text-gray-400"}`}>
          {userTranscript || "Listening for your speech..."}
        </p>
        {currentTurnPoints > 0 && (
          <p className="text-xs mt-2 font-bold text-green-600">+{currentTurnPoints} points</p>
        )}
      </div>

      {/* Speech Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleStartListening}
          disabled={isListening || isAISpeaking || !isActive}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded font-semibold transition ${
            isListening
              ? "bg-green-500 text-white"
              : "bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400"
          }`}
        >
          <Mic size={18} />
          {isListening ? "Listening..." : "Start Speaking"}
        </button>
        {isListening && (
          <button
            onClick={handleStopListening}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold transition"
          >
            Stop
          </button>
        )}
      </div>

      {/* Submission Status */}
      {isSubmitting && (
        <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-3">
          <p className="text-sm font-semibold text-blue-700">⏳ Submitting to API...</p>
          <p className="text-xs text-blue-600 mt-1">Sending your speech to the AI for analysis</p>
        </div>
      )}

      {/* Error Display */}
      {submissionError && (
        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-700">❌ {submissionError}</p>
          <p className="text-xs text-red-600 mt-1">Please try speaking again or check your connection</p>
        </div>
      )}

      {/* AI Response Display - Only in AI Debates */}
      {roomType === 'ai' && aiResponse && (
        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-semibold text-blue-700">🤖 AI Response:</p>
            {isAISpeaking && (
              <button
                onClick={handleStopAISpeech}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              >
                Stop Speech
              </button>
            )}
          </div>
          <div className="flex items-start gap-2">
            <Volume2 size={16} className="text-blue-600 mt-1 flex-shrink-0" />
            <p className="text-sm leading-relaxed text-gray-800">{aiResponse}</p>
          </div>
          {isAISpeaking && (
            <p className="text-xs mt-2 text-blue-600 font-semibold">🔊 AI Speaking...</p>
          )}
        </div>
      )}

      {roomType === 'ai' && isSubmitting && !aiResponse && (
        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
          <p className="text-sm font-semibold text-blue-700">🤖 AI Response:</p>
          <p className="text-sm text-blue-600 mt-2">⏳ Waiting for AI response...</p>
        </div>
      )}

      {/* Debate History */}
      {debateHistory.length > 0 && (
        <div className="bg-white rounded-lg p-3 border border-purple-200 max-h-40 overflow-y-auto">
          <p className="text-xs font-bold text-purple-700 mb-2">Debate History:</p>
          <div className="space-y-2 text-xs">
            {debateHistory.map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${
                  item.speaker === "user"
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "bg-blue-50 border-l-4 border-blue-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-gray-700">
                    {item.speaker === "user" ? "You" : "AI"}:
                  </span>
                  <span className="font-bold text-orange-600">+{item.points} pts</span>
                </div>
                <p className="text-gray-700 mt-1">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Browser Support Notice */}
      <p className="text-xs text-gray-500 text-center">
        💡 Tip: Use Chrome, Edge, or Firefox for best speech recognition
      </p>
    </div>
  );
};

export default AdvancedSpeechRecognition;
