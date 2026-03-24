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

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("[SpeechRecognition] Web Speech API not supported");
      alert("Speech Recognition not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after each phrase
    recognition.interimResults = true;
    recognition.lang = "en-US";

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
      setIsListening(false);
      
      let errorMsg = "Speech error occurred";
      
      // Map error codes to user-friendly messages
      const errorMap = {
        "network": "🌐 Network error - Please check your internet connection",
        "no-speech": "🔇 No speech detected - Please speak louder or move closer to the microphone",
        "audio-capture": "🎤 Microphone not accessible - Check browser permissions",
        "not-allowed": "❌ Microphone permission denied - Allow microphone in browser settings",
        "service-not-allowed": "🔒 Speech service not allowed in this context",
        "bad-grammar": "⚠️ Speech format not recognized - Try again",
        "net-timeout": "⏱️ Network timeout - Try again"
      };
      
      errorMsg = errorMap[event.error] || `Speech error: ${event.error}`;
      setSubmissionError(errorMsg);
      console.warn("[SpeechRecognition] Error message:", errorMsg);
      
      // Retry on network/no-speech errors
      if (event.error === "network" || event.error === "no-speech") {
        console.log(`[SpeechRecognition] Retrying after ${event.error} error...`);
        setTimeout(() => {
          if (isActive) {
            try {
              recognition.start();
            } catch (e) {
              console.error("[SpeechRecognition] Failed to restart:", e);
            }
          }
        }, 2000);
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
          console.log("[SpeechRecognition] AI Debate: Calling handleAIResponse to submit to API");
          await handleAIResponse(userSpeech, updatedHistory);
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
        setUserTranscript("🔇 No speech detected");
        setSubmissionError("🔇 No speech detected - Please check:\n1. Microphone is connected\n2. Browser has microphone permission\n3. You spoke clearly\n\nTry again!");
        listeningStartTimeRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [debateId, socket, isActive, roomType]);

  // CLEANUP: When debate ends (isActive becomes false), stop all ongoing speech
  useEffect(() => {
    if (!isActive) {
      console.log("[SpeechRecognition] ⏱️ DEBATE ENDED - Stopping all speech and recognition");
      
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
        console.warn("[SpeechRecognition] ⏱️ Debate has ended! Stopping AI response");
        setIsSubmitting(false);
        setIsAISpeaking(false);
        return;
      }

      setSubmissionError(null);
      setIsSubmitting(true);
      setIsAISpeaking(true);
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

        // Speak the AI response (always resolves, won't throw)
        console.log("[SpeechRecognition] Speaking AI response:", aiText);
        await speakText(aiText, { rate: 0.95, pitch: 1 });
        console.log("[SpeechRecognition] Speech completed successfully");
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
    }
  };

  // Start listening
  const handleStartListening = () => {
    if (!isActive) {
      alert("Start the debate first!");
      return;
    }

    if (!recognitionRef.current) {
      alert("Speech Recognition not available");
      return;
    }

    // Check for microphone permissions
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("[SpeechRecognition] Microphone permission granted");
        finalTranscriptRef.current = "";
        recognitionRef.current.start();
      })
      .catch(error => {
        console.error("[SpeechRecognition] Microphone permission denied:", error);
        alert("Please allow microphone access to use speech recognition");
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
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 rounded">
        <p className="text-yellow-800">Click "Start Debate" to enable speech features</p>
      </div>
    );
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
