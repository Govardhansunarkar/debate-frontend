import { useEffect, useRef, useState } from "react";
import { FiAlertTriangle, FiMic, FiMicOff, FiRefreshCw, FiStopCircle, FiVolume2 } from "react-icons/fi";

export default function SpeechRecognition({ debateId, onTranscript, isActive }) {
  console.log('[SpeechRecognition Component] Rendered - debateId:', debateId, 'isActive:', isActive);
  
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const retryCountRef = useRef(0);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState(null);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  useEffect(() => {
    console.log('[SpeechRecognition] useEffect running - initializing recognition');
    
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('[SpeechRecognition] Speech Recognition not supported');
      setError("Speech Recognition not supported in your browser");
      return;
    }

    console.log('[SpeechRecognition] Creating new recognition instance');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[SpeechRecognition.onstart] Recognition started');
      isListeningRef.current = true;
      setIsListening(true);
      setError(null);
      setMicPermissionDenied(false);
      retryCountRef.current = 0; // Reset retry count on successful start
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          final += transcriptSegment + " ";
        } else {
          interim += transcriptSegment;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        console.log("[SpeechRecognition] Final transcript received:", final);
        setTranscript((prev) => prev + final);
        
        // Send to parent with detailed logging
        const speechData = {
          text: final.trim(),
          timestamp: new Date(),
          isFinal: true,
        };
        console.log("[SpeechRecognition] Calling onTranscript with:", speechData);
        onTranscript(speechData);
      }
    };

    recognition.onerror = (event) => {
      // List of errors that should be silently ignored (non-critical)
      const ignorableErrors = ["aborted", "no-speech", "audio-capture"];
      
      // Network errors should be retried
      if (event.error === "network") {
        console.warn("Speech recognition network error - will retry automatically");
        
        // Retry with exponential backoff
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          console.log(`Retrying speech recognition (attempt ${retryCountRef.current}/3)`);
          
          // Wait before retrying
          const delayMs = Math.pow(2, retryCountRef.current) * 500;
          setTimeout(() => {
            if (isActive && isListeningRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (err) {
                console.log("Retry start error:", err);
              }
            }
          }, delayMs);
        } else {
          setError("Unable to connect to speech recognition service. Please check your internet connection and try again.");
          isListeningRef.current = false;
          setIsListening(false);
        }
        return;
      }
      
      // Handle microphone permission denial
      if (event.error === "permission-denied") {
        setMicPermissionDenied(true);
        setError("Microphone permission denied. Please enable microphone access in your browser settings.");
        isListeningRef.current = false;
        setIsListening(false);
        return;
      }
      
      // Silently ignore non-critical errors
      if (!ignorableErrors.includes(event.error)) {
        console.error("Speech recognition error:", event.error);
        setError(`Speech error: ${event.error}. Click Start Speaking to try again.`);
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition.onend] Recognition ended - isActive:', isActive);
      isListeningRef.current = false;
      setIsListening(false);
      setInterimTranscript(""); // Clear interim when recognition ends
      
      // Auto-restart if user is still in debate
      if (isActive && recognitionRef.current) {
        console.log('[SpeechRecognition.onend] Auto-restarting recognition');
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.log("Recognition already started or error:", err);
        }
      }
    };

    recognitionRef.current = recognition;
    console.log('[SpeechRecognition] Recognition object initialized and stored in ref');

    return () => {
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isActive, onTranscript]);

  const startListening = () => {
    console.log("[SpeechRecognition] startListening called");
    console.log("[SpeechRecognition] recognitionRef exists:", !!recognitionRef.current);
    console.log("[SpeechRecognition] isListeningRef.current:", isListeningRef.current);
    
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        // Check microphone permission (for browsers that support it)
        if (navigator.permissions && navigator.permissions.query) {
          navigator.permissions.query({ name: "microphone" }).then((result) => {
            if (result.state === "denied") {
              setMicPermissionDenied(true);
              setError("Microphone permission is denied. Please enable it in your browser settings.");
              return;
            }
          });
        }

        console.log("[SpeechRecognition] Calling recognition.start()");
        setTranscript("");
        setInterimTranscript("");
        setError(null);
        retryCountRef.current = 0; // Reset retry count
        recognitionRef.current.start();
        console.log("[SpeechRecognition] recognition.start() called successfully");
      } catch (err) {
        console.error("Error starting recognition:", err);
        setError("Error starting speech recognition. Please try again.");
      }
    } else {
      console.warn("[SpeechRecognition] Cannot start - recognition already running or ref missing");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error("Error stopping recognition:", err);
      }
    }
  };

  const resetTranscript = () => {
    setTranscript("");
    setInterimTranscript("");
  };

  console.log('[SpeechRecognition Render] isActive:', isActive, 'component will render');

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
          <FiMic className="h-4 w-4 text-slate-500" /> Live speech recognition
          {isListening && (
            <span className="inline-flex items-center gap-1 ml-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-red-600 font-medium">Recording</span>
            </span>
          )}
        </h3>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-xl mb-4 text-sm flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {micPermissionDenied && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl mb-4 text-sm flex items-start gap-2">
          <FiMicOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Microphone access required. Please check your browser permissions and allow microphone access.</span>
        </div>
      )}

      {/* Live Transcript Display */}
      <div className="bg-slate-50 rounded-xl p-4 mb-4 min-h-20 border border-slate-200">
        <div className="text-sm text-slate-500 mb-2 flex items-center gap-2"><FiVolume2 className="h-4 w-4" /> Your speech</div>
        <div className="text-slate-800 text-base leading-relaxed">
          {transcript}
          <span className="text-slate-500 italic">{interimTranscript}</span>
        </div>
      </div>

      {/* Word Count */}
      <div className="text-sm text-slate-500 mb-4">
        <span className="font-semibold">Words:</span> {transcript.split(" ").filter(w => w).length + interimTranscript.split(" ").filter(w => w).length}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={startListening}
          disabled={isListening || !isActive}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white py-2 rounded-xl font-medium transition"
        >
          <FiMic className="h-4 w-4" /> Start speaking
        </button>
        <button
          onClick={stopListening}
          disabled={!isListening}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 py-2 rounded-xl font-medium transition border border-slate-200"
        >
          <FiStopCircle className="h-4 w-4" /> Stop speaking
        </button>
        <button
          onClick={resetTranscript}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 py-2 rounded-xl font-medium transition border border-slate-200"
        >
          <FiRefreshCw className="h-4 w-4" /> Clear
        </button>
      </div>

      {!isActive && (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl mt-4 text-sm">
          Click "Start Debate" first to enable speech recognition.
        </div>
      )}

      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
        Tips: Speak clearly for better accuracy. Make sure microphone is enabled in browser settings. Try Chrome or Edge for best compatibility. Verify internet connection if you see network errors.
      </p>
    </div>
  );
}
