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
  const isSubmittingRef = useRef(false); // Track state synchronously
  const isAISpeakingRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const [submissionError, setSubmissionError] = useState(null);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const listeningStartTimeRef = useRef(null);
  const silenceTimeoutRef = useRef(null);  // Auto-submit after 5s silence
  const inactivityTimeoutRef = useRef(null);  // Reserved for inactivity management
  const autoCounterCooldownRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const noSpeechCounterRef = useRef(0);  // Retry counter for no-speech errors

  // Cleanup effect to prevent memory leaks and handle unmounting
  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
  }, [isAISpeaking]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

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
    recognition.lang = "en-IN";
    
    // Increase abort time for better speech detection
    try {
      recognition.maxAlternatives = 3;
    } catch (e) {
      // Some browsers don't support this property
    }

    let interimTranscript = "";

    recognition.onstart = () => {
      console.log("[SpeechRecognition] Listening started...");
      listeningStartTimeRef.current = Date.now();
      
      // Update state in an effect or timeout to avoid "setState in render" warning
      setTimeout(() => {
        setIsListening(true);
        setUserTranscript("");
        setSubmissionError(null);
      }, 0);
      
      interimTranscript = "";
      interimTranscriptRef.current = "";
    };

    recognition.onresult = (event) => {
      interimTranscript = "";
      lastActivityRef.current = Date.now();
      
      // Reset inactivity timer on speech detection
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }

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
      interimTranscriptRef.current = interimTranscript;
      setUserTranscript(displayText);

      // Auto-submit after 2-3 seconds of silence while speaking
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      
      // We only start the silence timer if the user has actually said something (interim or final)
      if (roomType === 'ai' && (finalTranscriptRef.current.trim() || interimTranscript.trim())) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log("[SpeechRecognition] 2.5s silence detected - Auto-submitting to LLM...");
          if (recognitionRef.current && isListening) {
            // STOP THE RECOGNITION - This triggers the .onend handler which sends to LLM
            recognitionRef.current.stop();
            setIsListening(false);
          }
        }, 2500);  // Reduced to 2.5 seconds for faster response
      }
    };

    recognition.onerror = (event) => {
      console.error("[SpeechRecognition] Error:", event.error);
      
      // Auto-recover from common transient errors to prevent debate stops
      const criticalErrors = ["not-allowed", "service-not-allowed", "no-speech"];
      
      if (criticalErrors.includes(event.error)) {
        if (event.error === "no-speech") {
          // Silent recovery for no-speech
          setTimeout(() => {
            if (isActiveRef.current && !isAISpeakingRef.current && !isSubmittingRef.current) {
              try { recognition.start(); } catch(e) {}
            }
          }, 300);
          return;
        }
      }

      let errorMsg = "Speech error occurred";
      const errorMap = {
        "network": "🌐 Network error - Please check your internet connection",
        "no-speech": "🔇 No speech detected - Try again",
        "audio-capture": "🎤 Microphone not accessible - Check browser permissions",
        "not-allowed": "❌ Microphone permission denied - Allow microphone in browser settings",
        "service-not-allowed": "🔒 Speech service not allowed in this context",
        "bad-grammar": "⚠️ Speech format not recognized - Try again",
        "net-timeout": "⏱️ Network timeout - Try again"
      };
      
      errorMsg = errorMap[event.error] || `Speech error: ${event.error}`;
      console.warn("[SpeechRecognition] Error message:", errorMsg);
      
      // Manual speak mode: do not auto-restart on no-speech errors.
      if (event.error === "no-speech") {
        noSpeechCounterRef.current++;
        console.log(`[SpeechRecognition] No-speech error count: ${noSpeechCounterRef.current}/2`);
        setSubmissionError("Please speak directly into the microphone.");
        setIsListening(false);
        noSpeechCounterRef.current = 0;
      } else {
        setSubmissionError(errorMsg);
        setIsListening(false);
        noSpeechCounterRef.current = 0;
      }
    };

    recognition.onend = async () => {
      console.log("[SpeechRecognition] Listening ended");
      setIsListening(false);

      // Manual speak mode: microphone stops after each submission.
      console.log("[SpeechRecognition] ⏹️ Microphone session ended. User must click SPEAK to talk again.");

      // Calculate speech duration in seconds
      const speechDuration = listeningStartTimeRef.current 
        ? Math.round((Date.now() - listeningStartTimeRef.current) / 1000) 
        : 0;
      console.log("[SpeechRecognition] Speech duration:", speechDuration, "seconds");

      // If we have a final transcript, process it
      const finalSpeech = finalTranscriptRef.current.trim();
      const interimSpeech = interimTranscriptRef.current.trim();
      const usedInterimFallback = !finalSpeech && Boolean(interimSpeech);
      const capturedSpeech = finalSpeech || interimSpeech;
      if (capturedSpeech) {
        const userSpeech = capturedSpeech;
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
          duration: speechDuration,
          transcriptSource: usedInterimFallback ? "interim-fallback" : "final"
        };
        
        // Use functional state update with immediate execution to ensure turn count is always current
        setDebateHistory(prev => {
          const updatedHistory = [...prev, newHistoryItem];
          setUserPoints(pts => pts + points);
          
          console.log("[SpeechRecognition] Calling parent callback onSpeechEnd");
          if (onSpeechEnd) onSpeechEnd(newHistoryItem);

          // Only get AI response if this is an AI debate room AND debate is still active
          if (roomType === 'ai' && isActive) {
            console.log("[SpeechRecognition] AI Debate: Immediately handling AI sequence...");
            // Use setTimeout to avoid potential state update conflicts
            setTimeout(() => {
              handleAIResponse(userSpeech, updatedHistory, {
                speechDuration,
                transcriptSource: usedInterimFallback ? "interim-fallback" : "final"
              });
            }, 100);
          }
          
          return updatedHistory;
        });

        // Reset for next turn
        finalTranscriptRef.current = "";
        interimTranscriptRef.current = "";
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
  const handleAIResponse = async (userSpeech, currentDebateHistory, speechMeta = {}) => {
    // PREVENT DOUBLE EXECUTION: Check both state and Ref
    if (isSubmittingRef.current || isSubmitting || !isActive) {
      console.warn("[SpeechRecognition] Blocked double submission attempt");
      return;
    }

    try {
      setSubmissionError(null);
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      setIsAISpeaking(true);
      
      // Clear inactivity timer while AI is responding
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      
      console.log("[SpeechRecognition] Submitting to API:", userSpeech);
      const response = await getAIResponse(userSpeech, topic, currentDebateHistory, speechMeta);

      if (response.success) {
        const aiText = response.response || "I disagree with that point.";
        setAiResponse(aiText);

        const aiWordCount = aiText.split(" ").filter(w => w).length;
        const estimatedAiDuration = Math.round((aiWordCount / 150) * 60);

        // Add to debate history
        const aiHistoryItem = {
          speaker: "ai",
          text: aiText,
          points: response.points || 10,
          timestamp: new Date(),
          engine: response.engine,
          duration: estimatedAiDuration
        };
        
        setDebateHistory(prev => {
          // PREVENT DUPLICATE HISTORY: Check if the last item is already this AI message
          if (prev.length > 0 && prev[prev.length - 1].text === aiText && prev[prev.length - 1].speaker === 'ai') {
            return prev;
          }
          setAiPoints(pts => pts + (response.points || 10));
          return [...prev, aiHistoryItem];
        });

        // Trigger TTS only. Manual speak mode means no auto-restart after AI finishes.
        setTimeout(() => {
          speakText(aiText).then(() => {
            console.log("[SpeechRecognition] AI finished speaking.");
            setIsAISpeaking(false);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
          }).catch(err => {
            console.error("[SpeechRecognition] AI Speech failed:", err);
            setIsAISpeaking(false);
            setIsSubmitting(false);
            isSubmittingRef.current = false;
          });
        }, 100);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("[SpeechRecognition] AI Error:", error);
      setSubmissionError("AI response failed. Please try speaking again.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      setIsAISpeaking(false);
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
        interimTranscriptRef.current = "";
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

  if (!isActive && roomType !== 'ai') {
    return null;
  }

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-slate-100 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-900 font-sans relative ${!isActive ? 'opacity-50 grayscale scale-[0.98]' : ''} transition-all duration-700`}>
      
      {/* 🤖 MAIN ANIMATION AREA - Ultra Compact Size */}
      <div className="relative flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden min-h-[200px]">
        
        {/* Start Overlay - Only if in AI mode but not started */}
        {!isActive && roomType === 'ai' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm backdrop-grayscale">
            <div className="text-center px-6 py-4 rounded-3xl border border-white/10 bg-black/40 shadow-2xl animate-pulse">
              <p className="text-xs font-black text-blue-400 tracking-[5px] uppercase italic">System Standby</p>
              <p className="text-[10px] text-white/40 mt-1 uppercase font-bold">Waiting for Arena Start</p>
            </div>
          </div>
        )}

        {/* Animated Background Atmosphere */}
        <div className={`absolute inset-0 transition-all duration-1000 ${isAISpeaking ? 'opacity-40' : 'opacity-10'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600 rounded-full blur-[100px] animate-pulse [animation-delay:1s]"></div>
        </div>

        {/* AI Entity Visualizer */}
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* Circular Pulse Ring */}
          <div className={`relative p-8 rounded-full transition-all duration-700 transform ${isAISpeaking ? 'scale-110 bg-purple-500/10 shadow-[0_0_80px_rgba(168,85,247,0.3)] border-2 border-purple-500/30' : 'bg-slate-900 border border-white/5'}`}>
            {/* Visualizer Waves (only while speaking) */}
            {isAISpeaking && (
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <div className="w-full h-full rounded-full border border-purple-400 animate-[ping_1.5s_infinite]"></div>
                <div className="absolute w-full h-full rounded-full border border-blue-400 animate-[ping_2s_infinite]"></div>
              </div>
            )}
            
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" 
                 className={`transition-all duration-500 ${isAISpeaking ? 'text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'text-slate-600'}`}>
              <path d="M12 8V4H8" />
              <rect width="18" height="14" x="3" y="7" rx="2" />
              <path d="M2 13h1" />
              <path d="M21 13h1" />
              <path d="M15 12v2" />
              <path d="M9 12v2" />
              <path d="M8 18h8" />
            </svg>
          </div>
          
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-black text-white tracking-[0.2em] uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-white to-blue-400">
              AI ARENA PRO
            </h2>
            <div className="flex items-center justify-center gap-4 relative">
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-blue-500 tracking-[2px] uppercase">You</span>
                <span className="text-xl font-mono text-white tracking-widest">{userPoints.toString().padStart(2, '0')}</span>
              </div>
              <div className="h-6 w-[1px] bg-slate-800"></div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-black text-purple-500 tracking-[2px] uppercase">AI</span>
                <span className="text-xl font-mono text-white tracking-widest">{aiPoints.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
          
          {/* Status Capsule - Moved to side as requested */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/80 px-4 py-2 rounded-full border border-white/10 backdrop-blur-3xl shadow-2xl z-20">
            <div className={`w-2 h-2 rounded-full ${isSubmitting ? 'bg-yellow-400 animate-[ping_1s_infinite]' : isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-[8px] font-black text-white/90 uppercase tracking-[2px]">
              {isSubmitting ? 'ANALYZING' : isListening ? 'MIC ACTIVE' : isAISpeaking ? 'RESPONDING' : 'READY'}
            </span>
          </div>
        </div>

        {/* Live Subtitle (The words you are saying right now) */}
        {isListening && (
          <div className="absolute bottom-2 left-0 right-0 px-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-400 z-30">
            <div className="inline-block backdrop-blur-md bg-black/60 py-2 px-6 rounded-2xl border border-white/10 shadow-2xl transform -translate-y-2">
              <p className="text-xs font-bold text-white leading-relaxed italic opacity-95">
                "{userTranscript || "Listening..."}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 📜 DEBATE LOGS AREA - Bottom Section */}
      <div className="bg-slate-900/80 backdrop-blur-md border-t border-white/5 p-4 flex flex-col gap-3">
        
        {/* Chat Logs Scroll - Filtered to last 3 for clarity */}
        <div className="h-32 overflow-y-auto space-y-3 px-2 scrollbar-hide flex flex-col-reverse">
          <div className="flex flex-col gap-3">
            {[...debateHistory].reverse().map((msg, i) => (
              <div key={i} className={`flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.speaker === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[8px] font-black border ${
                  msg.speaker === 'ai' ? 'bg-purple-600/20 border-purple-500/40 text-purple-400' : 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                }`}>
                  {msg.speaker === 'ai' ? 'AI' : 'U'}
                </div>
                <div className={`p-2.5 rounded-xl text-xs font-medium leading-relaxed ${
                  msg.speaker === 'ai' ? 'bg-white/5 text-slate-200 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/40'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {debateHistory.length === 0 && (
              <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-[5px] py-8 opacity-30 italic">Start Speaking</p>
            )}
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={isSubmitting || isAISpeaking}
            className={`flex-1 flex items-center justify-center gap-3 p-3.5 rounded-xl font-black text-sm transition-all transform active:scale-95 shadow-2xl border-b-4
              ${isListening 
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-900 animate-pulse' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-900 shadow-indigo-900/40'}
              ${(isSubmitting || isAISpeaking) ? 'grayscale opacity-30 cursor-not-allowed' : ''}
            `}
          >
            {isListening ? (
              <><MicOff size={18} /> FINISH</>
            ) : (
              <><Mic size={18} /> SPEAK</>
            )}
          </button>
          
          {isAISpeaking && (
            <button
              onClick={handleStopAISpeech}
              className="px-4 h-[48px] bg-slate-800 hover:bg-slate-700 text-purple-400 rounded-xl font-black border border-purple-500/20 transition-all shadow-xl flex items-center justify-center"
            >
              <Volume2 size={20} />
            </button>
          )}
        </div>

        {/* Tiny Metadata Footer */}
        <div className="flex justify-between items-center px-1 text-[8px] font-black text-slate-600 tracking-[2px] uppercase">
          <span>NVIDIA NEMOTRON AI ENGINE</span>
          <span>WEBSPEECH API 2.0</span>
          {submissionError && <span className="text-red-500 italic">SYSTEM_ERROR: {submissionError}</span>}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};

export default AdvancedSpeechRecognition;
