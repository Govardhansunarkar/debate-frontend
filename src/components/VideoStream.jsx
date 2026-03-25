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
    
    // Determine backend host based on environment
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const backendHost = isProduction ? 'debate-backend-paro.onrender.com' : 'localhost';
    
    // PeerJS configuration - specialized for Render Production
    // Using peerjs.com's free cloud server instead of self-hosted for maximum reliability
    const peerConfig = isProduction 
      ? {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ]
          }
        }
      : {
          host: 'localhost',
          port: 3001,
          path: '/peerjs',
          debug: 1,
          config: {
            iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }]
          }
        };
    
    console.log(`🔗 PeerJS Config (${isProduction ? 'CLOUD' : 'LOCAL'}):`, peerConfig);
    
    try {
      const peer = isProduction ? new Peer(peerConfig) : new Peer(peerId, peerConfig);

      peer.on("error", (err) => {
        console.error("❌ PeerJS Error:", err.type, "-", err.message || err);
        if (err.type === 'unavailable-id') {
          console.log("⚠️ Peer ID already in use");
        } else if (err.type === 'peer-unavailable') {
          console.log("⚠️ Peer not available");
        }
      });

      peer.on("open", (id) => {
        console.log("✅ PeerJS connected! ID:", id);
      });

      peerRef.current = peer;
    } catch (err) {
      console.error("Failed to initialize PeerJS:", err);
      setError("Failed to initialize video connection");
    }

    return () => {
      if (peerRef.current) {
        console.log("Cleaning up PeerJS");
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

  // Enhanced grid calculation for Google Meet style
  const remoteCount = Object.keys(remoteStreams).length;
  const totalCount = remoteCount + 1; // +1 for local video
  
  return (
    <div className="flex flex-col h-[600px] w-full bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative">
      {/* Video Content Area */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        <div className={`grid gap-4 h-full min-h-[400px] ${
          totalCount === 1 ? 'grid-cols-1' :
          totalCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
          totalCount <= 4 ? 'grid-cols-2' :
          totalCount <= 6 ? 'grid-cols-2 md:grid-cols-3' :
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {/* Local Video - Always first and highlighted */}
          <div className="relative group rounded-xl overflow-hidden bg-gray-800 border-2 border-blue-500/50 shadow-lg aspect-video">
            {!isCameraOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800">
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl border-4 border-white/20">
                  {playerName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="mt-4 text-gray-400 font-medium tracking-wide">Camera is Off</span>
              </div>
            ) : null}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-300 ${!isCameraOn ? 'opacity-0' : 'opacity-100'}`}
            />
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/10">
              <span className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-blue-500 animate-pulse' : 'bg-red-500'}`}></span>
              You ({playerName})
              {!isMicOn && <span className="ml-1 text-red-400 font-bold px-1 rounded bg-black/40">MUTED</span>}
            </div>
          </div>

          {/* Remote Videos */}
          {Object.entries(remoteStreams).map(([remoteUserId, data]) => (
            <div key={remoteUserId} className="relative group rounded-xl overflow-hidden bg-gray-800 border border-gray-700 hover:border-blue-400/50 transition-all duration-300 shadow-xl aspect-video">
              <RemoteVideo stream={data.stream} />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-xs font-semibold border border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {data.playerName || "Participant"}
              </div>
            </div>
          ))}
          
          {/* AI Avatar (if AI debate and alone) */}
          {isAIDebate && remoteCount === 0 && (
            <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 border-2 border-purple-500/30 shadow-2xl flex flex-col items-center justify-center aspect-video">
              <div className="text-7xl mb-4 animate-pulse drop-shadow-2xl">🤖</div>
              <h3 className="text-xl font-black text-white tracking-widest uppercase">AI Arena Pro</h3>
              <div className="mt-4 flex items-center gap-2 bg-purple-500/20 px-4 py-2 rounded-full border border-purple-500/40">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></span>
                <span className="text-purple-200 text-xs font-bold uppercase tracking-tighter">Analyzing Argument</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meet-style Control Bar */}
      <div className="bg-gray-800/95 backdrop-blur-2xl border-t border-gray-700 p-6 flex items-center justify-center gap-10">
        {/* Toggle Mic */}
        <button
          onClick={toggleMicrophone}
          className={`group p-5 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center relative ${
            isMicOn 
              ? "bg-gray-700 text-white hover:bg-gray-600 border border-gray-600" 
              : "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20 shadow-xl"
          }`}
          title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
        >
          {isMicOn ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
          <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-xs px-2 py-1 rounded">Mic</span>
        </button>

        {/* Toggle Video */}
        <button
          onClick={toggleCamera}
          className={`group p-5 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center relative ${
            isCameraOn 
              ? "bg-gray-700 text-white hover:bg-gray-600 border border-gray-600" 
              : "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20 shadow-xl"
          }`}
          title={isCameraOn ? "Turn Camera Off" : "Turn Camera On"}
        >
          {isCameraOn ? (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
          <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-xs px-2 py-1 rounded">Camera</span>
        </button>

        {/* End Room Button (Red Circle) */}
        <button
          className="group p-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-2xl shadow-red-600/40 relative"
          title="Leave Debate"
          onClick={() => {
            if(confirm("Are you sure you want to leave the debate?")) window.location.href = '/';
          }}
        >
          <svg className="w-8 h-8 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11H8V11h8v2z"/>
          </svg>
          <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap font-bold">Leave Debate</span>
        </button>
      </div>

      {error && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center gap-6 border border-white/20 animate-bounce">
          <span className="text-xs font-black tracking-widest uppercase">{error}</span>
          <button onClick={retryPermissions} className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 transition">RETRY</button>
        </div>
      )}
    </div>
  );
}

// Simple internal component to handle remote video streams
function RemoteVideo({ stream }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover"
    />
  );
}
