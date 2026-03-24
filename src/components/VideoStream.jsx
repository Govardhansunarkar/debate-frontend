import { useEffect, useRef, useState } from "react";
import Peer from "peerjs";
import { socket } from "../services/socket";

export default function VideoStream({ debateId, userId, playerName, isAIDebate = false, participants = [] }) {
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // { userId: { peerConnection, stream, videoRef } }
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: { stream, playerName } }
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [error, setError] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState(new Set());
  const peerRef = useRef(null);
  const participantNamesRef = useRef({}); // Track participant names
  
  // Audio enhancement state
  const [audioAnalysers, setAudioAnalysers] = useState({}); // { userId: analyserNode }
  const [speakingUsers, setSpeakingUsers] = useState(new Set()); // Who's currently speaking
  const [volumeLevels, setVolumeLevels] = useState({}); // { userId: volume (0-100) }
  const [remotePeerVolumes, setRemotePeerVolumes] = useState({}); // { userId: volume (0-1) }

  // Initialize PeerJS
  useEffect(() => {
    // Create a unique peer ID for this user
    const peerId = `${debateId}_${userId}`;
    
    // Get PeerJS server from Render backend (uses same server as Express)
    // For production, use Render URL; for development use localhost
    const isProduction = import.meta.env.MODE === 'production';
    const peerHost = isProduction 
      ? 'debate-backend-paro.onrender.com'
      : (import.meta.env.VITE_PEERJS_HOST || 'localhost');
    const peerPort = isProduction 
      ? 9000  // Use PeerJS port directly
      : (import.meta.env.VITE_PEERJS_PORT ? parseInt(import.meta.env.VITE_PEERJS_PORT) : 9000);
    const peerUseSsl = isProduction ? true : false;  // Use SSL for HTTPS domain
    
    const peer = new Peer(peerId, {
      host: peerHost,
      port: peerPort,
      path: "/peerjs",
      secure: peerUseSsl,
      debug: 2, // Show more debug info for troubleshooting
      allow_discovery: false,
      config: {
        iceServers: [
          { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
        ]
      }
    });

    peer.on("error", (err) => {
      console.warn("PeerJS Error:", err.type, err);
      if (err.type === 'unavailable-id') {
        console.log("Peer ID already in use, waiting for fresh connection...");
      }
    });

    peer.on("open", () => {
      console.log("PeerJS connected:", peerId);
    });

    peerRef.current = peer;

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [debateId, userId]);

  // Get local camera/microphone with audio enhancements
  useEffect(() => {
    const setupLocalStream = async () => {
      try {
        // First, check if permissions API is available
        if (navigator.permissions) {
          try {
            const cameraPerms = await navigator.permissions.query({ name: 'camera' });
            const micPerms = await navigator.permissions.query({ name: 'microphone' });
            
            if (cameraPerms.state === 'denied' || micPerms.state === 'denied') {
              console.warn("🔒 Camera/Microphone permissions were previously denied");
              console.warn("📍 Check browser settings → Privacy → Camera/Microphone");
              setError("❌ Camera/Microphone permissions denied. Check browser settings and allow access.");
              return;
            }
          } catch (e) {
            console.log("Permissions API not fully supported, proceeding with getUserMedia");
          }
        }

        console.log("🎥 Requesting camera/microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: {
            echoCancellation: true,      
            noiseSuppression: true,      
            autoGainControl: true,       
            sampleRate: 48000,           
          },
        });
        
        console.log("✅ Camera/Microphone access granted!");
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Signal to other players that this user is ready
        socket.emit("video-ready", { debateId, userId, playerName });
        console.log("✅ Local audio enhanced with: echo cancellation, noise suppression, auto-gain");
      } catch (err) {
        console.error("❌ Error accessing camera/microphone:", err);
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        
        let errorMsg = "Cannot access camera or microphone. ";
        
        if (err.name === 'NotAllowedError') {
          errorMsg = "❌ PERMISSION DENIED\n\n";
          errorMsg += "📍 Click the 🔒 lock icon in the address bar\n";
          errorMsg += "📍 Find 'Camera' & 'Microphone' settings\n";
          errorMsg += "📍 Change to 'Allow'\n";
          errorMsg += "📍 Refresh the page";
        } else if (err.name === 'NotFoundError') {
          errorMsg = "❌ CAMERA/MICROPHONE NOT FOUND\n\n";
          errorMsg += "📍 Check hardware is connected\n";
          errorMsg += "📍 Check no other app is using it\n";
          errorMsg += "📍 Try a different browser";
        } else if (err.name === 'NotReadableError') {
          errorMsg = "❌ CAMERA/MICROPHONE IN USE\n\n";
          errorMsg += "📍 Close other apps using camera\n";
          errorMsg += "📍 Refresh this page\n";
          errorMsg += "📍 Try a different browser tab";
        } else if (err.name === 'SecurityError') {
          errorMsg = "❌ SECURITY ERROR\n\n";
          errorMsg += "📍 Your browser blocked access\n";
          errorMsg += "📍 Check if connection is HTTPS\n";
          errorMsg += "📍 Try accessing from HTTPS URL";
        }
        
        setError(errorMsg);
      }
    };

    setupLocalStream();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [debateId, userId, playerName]);

  // Monitor audio activity for ALL remote streams (speaker detection) + volume control
  useEffect(() => {
    const audioContexts = {};
    const analysers = {};
    const gainNodes = {};

    const monitorAudioActivity = async () => {
      try {
        for (const [remoteUserId, data] of Object.entries(remoteStreams)) {
          if (!data.stream) continue;
          
          // Create audio context if needed
          if (!audioContexts[remoteUserId]) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const mediaSource = audioContext.createMediaStreamSource(data.stream);
            const analyser = audioContext.createAnalyser();
            const gainNode = audioContext.createGain();
            
            analyser.fftSize = 2048;
            mediaSource.connect(analyser);
            mediaSource.connect(gainNode);
            gainNode.connect(audioContext.destination);

            audioContexts[remoteUserId] = audioContext;
            analysers[remoteUserId] = analyser;
            gainNodes[remoteUserId] = gainNode;
          }

          // Apply volume control
          const gain = gainNodes[remoteUserId];
          if (gain) {
            gain.gain.value = remotePeerVolumes[remoteUserId] || 1;
          }

          // Get audio frequency data
          const analyser = analysers[remoteUserId];
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume (0-100)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const volume = Math.min(100, Math.round(average * 1.5));

          setVolumeLevels((prev) => ({ ...prev, [remoteUserId]: volume }));

          // Detect if user is speaking (threshold: 20)
          if (volume > 20) {
            setSpeakingUsers((prev) => new Set([...prev, remoteUserId]));
          } else {
            setSpeakingUsers((prev) => {
              const updated = new Set(prev);
              updated.delete(remoteUserId);
              return updated;
            });
          }
        }
      } catch (err) {
        // Silently handle CORS or context errors
        console.log("Audio analysis: ", err.message);
      }
    };

    const interval = setInterval(monitorAudioActivity, 100); // Update every 100ms

    return () => {
      clearInterval(interval);
      Object.values(audioContexts).forEach((ctx) => {
        if (ctx.state !== "closed") ctx.close();
      });
    };
  }, [remoteStreams, remotePeerVolumes]);

  // Handle incoming video-ready signal from other players
  useEffect(() => {
    const handleVideoReady = (data) => {
      console.log(`Video ready from ${data.playerName} (${data.userId})`);
      
      // Store participant name
      participantNamesRef.current[data.userId] = data.playerName;
      
      if (data.userId !== userId && !connectedUsers.has(data.userId) && localStream && peerRef.current) {
        // Don't immediately connect, wait a bit to allow multiple users to signal readiness
        setTimeout(() => {
          if (!connectedUsers.has(data.userId) && peerRef.current && localStream) {
            makePeerConnection(data.userId, data);
          }
        }, 500);
      }
    };

    socket.on("video-ready", handleVideoReady);

    return () => {
      socket.off("video-ready", handleVideoReady);
    };
  }, [connectedUsers, userId, localStream]);

  // Create peer connection
  const makePeerConnection = (remoteUserId, remoteData) => {
    if (!localStream || !peerRef.current) return;

    try {
      const peerId = `${debateId}_${remoteUserId}`;
      const playerNameForConnection = participantNamesRef.current[remoteUserId] || "Participant";
      
      const call = peerRef.current.call(peerId, localStream, {
        metadata: { playerName: playerName }
      });

      call.on("stream", (remoteStream) => {
        console.log("Received remote stream from:", remoteUserId);
        setRemoteStreams((prev) => ({ 
          ...prev, 
          [remoteUserId]: { 
            stream: remoteStream, 
            playerName: playerNameForConnection 
          } 
        }));
        setConnectedUsers((prev) => new Set([...prev, remoteUserId]));
      });

      call.on("close", () => {
        console.log("Connection closed with:", remoteUserId);
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteUserId];
          return updated;
        });
        setConnectedUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(remoteUserId);
          return updated;
        });
        setPeers((prev) => {
          const updated = { ...prev };
          delete updated[remoteUserId];
          return updated;
        });
      });

      call.on("error", (err) => {
        console.error(`Error with peer ${remoteUserId}:`, err);
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteUserId];
          return updated;
        });
      });

      setPeers((prev) => ({ ...prev, [remoteUserId]: call }));
    } catch (err) {
      console.error("Error making peer connection:", err);
    }
  };

  // Handle incoming calls
  useEffect(() => {
    if (!peerRef.current || !localStream) return;

    const handleCall = (call) => {
      const remoteUserId = call.peer.split("_")[1];
      const playerNameForConnection = participantNamesRef.current[remoteUserId] || "Participant";
      
      console.log(`Incoming call from ${remoteUserId}`);
      
      call.answer(localStream);

      call.on("stream", (remoteStream) => {
        console.log("Received stream from answering call:", remoteUserId);
        setRemoteStreams((prev) => ({ 
          ...prev, 
          [remoteUserId]: { 
            stream: remoteStream, 
            playerName: playerNameForConnection 
          } 
        }));
        setConnectedUsers((prev) => new Set([...prev, remoteUserId]));
      });

      call.on("close", () => {
        console.log("Answered call closed with:", remoteUserId);
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteUserId];
          return updated;
        });
        setConnectedUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(remoteUserId);
          return updated;
        });
      });

      call.on("error", (err) => {
        console.error(`Error in answered call with ${remoteUserId}:`, err);
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[remoteUserId];
          return updated;
        });
      });

      setPeers((prev) => ({ ...prev, [remoteUserId]: call }));
    };

    peerRef.current.on("call", handleCall);

    return () => {
      if (peerRef.current) {
        peerRef.current.off("call", handleCall);
      }
    };
  }, [localStream, playerName]);

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newCameraState = !isCameraOn;
      setIsCameraOn(newCameraState);
      
      // Broadcast camera state change to all participants
      socket.emit("video-state-change", {
        debateId,
        userId,
        playerName,
        cameraOn: newCameraState,
        micOn: isMicOn
      });
      console.log(`[Video] Camera toggled to: ${newCameraState ? 'ON' : 'OFF'}`);
    }
  };

  const toggleMicrophone = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      const newMicState = !isMicOn;
      setIsMicOn(newMicState);
      
      // Broadcast microphone state change to all participants
      socket.emit("video-state-change", {
        debateId,
        userId,
        playerName,
        cameraOn: isCameraOn,
        micOn: newMicState
      });
      console.log(`[Video] Microphone toggled to: ${newMicState ? 'ON' : 'OFF'}`);
    }
  };

  // Retry camera/microphone access after permission granted
  const retryPermissions = async () => {
    console.log("🔄 Retrying camera/microphone access...");
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: {
          echoCancellation: true,      
          noiseSuppression: true,      
          autoGainControl: true,       
          sampleRate: 48000,           
        },
      });
      
      console.log("✅ Camera/Microphone access granted!");
      setLocalStream(stream);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit("video-ready", { debateId, userId, playerName });
      console.log("✅ Local audio enhanced");
    } catch (err) {
      console.error("❌ Retry failed:", err.name);
      setError(err.name === 'NotAllowedError' 
        ? "Still denied. Please allow camera/microphone in browser settings and try again." 
        : "Retry failed. Please check your camera/microphone and try again.");
    }
  };

  // Enhanced grid calculation for many users
  const remoteCount = Object.keys(remoteStreams).length;
  const totalCount = remoteCount + 1; // +1 for local video
  
  let gridClass = "grid-cols-1";
  if (totalCount === 2) gridClass = "grid-cols-1 md:grid-cols-2";
  if (totalCount === 3) gridClass = "grid-cols-1 md:grid-cols-3";
  if (totalCount === 4) gridClass = "grid-cols-2 md:grid-cols-2";
  if (totalCount === 5) gridClass = "grid-cols-2 md:grid-cols-5";
  if (totalCount === 6) gridClass = "grid-cols-2 md:grid-cols-3";
  if (totalCount === 7) gridClass = "grid-cols-2 md:grid-cols-4 lg:grid-cols-7";
  if (totalCount === 8) gridClass = "grid-cols-2 md:grid-cols-4";
  if (totalCount === 9) gridClass = "grid-cols-3 md:grid-cols-3";
  if (totalCount >= 10) gridClass = "grid-cols-3 md:grid-cols-5 lg:grid-cols-6";

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <div className="whitespace-pre-line text-sm">{error}</div>
          <button
            onClick={retryPermissions}
            className="mt-3 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition"
          >
            🔄 Retry Camera/Microphone Access
          </button>
          <p className="text-xs mt-2 italic">After allowing permissions in browser settings, click Retry above.</p>
        </div>
      )}

      {/* Local Video */}
      <div className="mb-3 bg-black rounded-lg overflow-hidden shadow-lg">
        <div className="relative w-full aspect-video bg-gray-900 h-64">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
            📹 You ({playerName})
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={toggleCamera}
              className={`px-2 py-1 rounded text-sm font-semibold transition ${
                isCameraOn
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-red-500 hover:bg-red-600"
              } text-white`}
              title={isCameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {isCameraOn ? "📹" : "🚫"}
            </button>
            <button
              onClick={toggleMicrophone}
              className={`px-2 py-1 rounded text-sm font-semibold transition ${
                isMicOn ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
              } text-white`}
              title={isMicOn ? "Mute microphone" : "Unmute microphone"}
            >
              {isMicOn ? "🎤" : "🔇"}
            </button>
          </div>
        </div>
      </div>

      {/* Remote Videos Grid */}
      {remoteCount > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-2 text-gray-800 flex items-center gap-2">
            🎥 <span>Debate Participants ({remoteCount})</span>
            <span className="inline-block bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              LIVE
            </span>
          </h3>
          <div className={`grid ${gridClass} gap-2 auto-rows-max`}>
            {Object.entries(remoteStreams).map(([remoteUserId, data]) => {
              const isSpeaking = speakingUsers.has(remoteUserId);
              const volume = volumeLevels[remoteUserId] || 0;
              const volumePercent = Math.min(100, volume);
              
              return (
                <div key={remoteUserId} className="w-full">
                  <div className={`bg-black rounded-lg overflow-hidden shadow-lg transition-all ${isSpeaking ? 'ring-2 ring-green-400 scale-105' : 'ring-1 ring-gray-600'}`}>
                    <div className="relative w-full aspect-video bg-gray-900">
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        srcObject={data.stream}
                      />
                      {/* Speaking indicator */}
                      {isSpeaking && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          SPEAKING
                        </div>
                      )}
                      
                      {/* Streaming status */}
                      {!isSpeaking && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                          STREAMING
                        </div>
                      )}
                      
                      {/* Player name */}
                      <div className="absolute bottom-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
                        👤 {data.playerName}
                      </div>

                      {/* Volume visualization bar */}
                      <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1">
                        <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              volumePercent > 70 ? 'bg-red-500' : volumePercent > 40 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${volumePercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-white bg-black/60 px-1 rounded">{volumePercent}%</span>
                      </div>
                    </div>
                    
                    {/* Volume control slider */}
                    <div className="bg-gray-800 p-2 flex items-center gap-2">
                      <span className="text-xs text-gray-300 min-w-6">🔊</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={remotePeerVolumes[remoteUserId] || 100}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value) / 100;
                          setRemotePeerVolumes((prev) => ({
                            ...prev,
                            [remoteUserId]: newVolume,
                          }));
                        }}
                        className="flex-1 h-1 bg-gray-600 rounded accent-blue-500 cursor-pointer"
                        title="Adjust participant volume"
                      />
                      <span className="text-xs text-gray-300 min-w-6 text-right">{Math.round((remotePeerVolumes[remoteUserId] || 1) * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Avatar (if AI debate) */}
      {isAIDebate && remoteCount === 0 && (
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-center text-white shadow-lg">
          <div className="text-6xl mb-2 animate-bounce">🤖</div>
          <h3 className="text-lg font-bold">AI Opponent</h3>
          <p className="mt-1 text-white/80 text-sm">Listening and analyzing your arguments...</p>
        </div>
      )}

      {/* Waiting Message */}
      {!isAIDebate && remoteCount === 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center shadow">
          <p className="text-blue-800 font-semibold text-sm">⏳ Waiting for other participants to join...</p>
          <p className="text-blue-600 text-xs mt-1">Your camera and microphone are streaming and ready!</p>
          <p className="text-blue-500 text-xs mt-1">Connected users: {connectedUsers.size}</p>
        </div>
      )}
    </div>
  );
}

// Remote video player component
function RemoteVideoPlayer({ stream, userId, playerName = "Participant" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="bg-black rounded-lg overflow-hidden shadow-lg">
      <div className="relative w-full aspect-video bg-gray-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-2 rounded text-sm font-semibold">
          📹 {playerName}
        </div>
      </div>
    </div>
  );
}
