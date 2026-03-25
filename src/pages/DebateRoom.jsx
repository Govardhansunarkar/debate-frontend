import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { endDebate } from "../services/api";
import { stopSpeech } from "../services/aiDebateService";
import { socket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import VideoStream from "../components/VideoStream";
import AdvancedSpeechRecognition from "../components/AdvancedSpeechRecognition";
import { trackDebateMetrics, prepareDebateTranscript } from "../services/debateAnalysis";

export default function DebateRoom() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [timer, setTimer] = useState(300);
  const [isActive, setIsActive] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [players, setPlayers] = useState([]);
  const [topic, setTopic] = useState("AI and the Future");
  const [isAIDebate, setIsAIDebate] = useState(false);
  const [roomType, setRoomType] = useState('user-only');  // Track room type
  const [speeches, setSpeeches] = useState([]); // Track all speeches
  const [debateMetrics, setDebateMetrics] = useState(null); // Debate stats
  
  // Team debate state
  const [isTeamDebate, setIsTeamDebate] = useState(false);
  const [teamSize, setTeamSize] = useState(null); // '2v2' or '3v3'
  const [myTeam, setMyTeam] = useState(null); // 'FOR' or 'AGAINST'
  const [teamFor, setTeamFor] = useState([]); // Team FOR players
  const [teamAgainst, setTeamAgainst] = useState([]); // Team AGAINST players
  const [turnOrder, setTurnOrder] = useState([]); // Turn order for team debates
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0); // Current turn

  useEffect(() => {
    // Check if this is an AI debate or team debate
    const params = new URLSearchParams(window.location.search);
    const isAI = params.get('ai') === 'true';
    const topicFromUrl = params.get('topic');
    const matchType = params.get('matchType');
    const teamSizeFromUrl = params.get('teamSize');
    const teamAssignmentFromUrl = params.get('teamAssignment');
    
    setIsAIDebate(isAI);
    
    // Set topic from URL if available
    if (topicFromUrl) {
      setTopic(decodeURIComponent(topicFromUrl));
    }
    
    // Set room type based on URL parameters
    if (isAI) {
      setRoomType('ai');
    } else if (matchType === 'team') {
      setRoomType('team-debate');
      setIsTeamDebate(true);
      setTeamSize(teamSizeFromUrl);
      setMyTeam(teamAssignmentFromUrl);
    }

    socket.emit("join-debate", {
      debateId,
      userId: user?.id,
      playerName: user?.name,
      roomType: isAI ? 'ai' : (matchType === 'team' ? 'team-debate' : 'user-only'),
      debateType: matchType === 'team' ? 'team-debate' : (isAI ? 'ai' : 'user-only'),
      team: teamAssignmentFromUrl || null, // Pass team assignment
      topic: topicFromUrl ? decodeURIComponent(topicFromUrl) : 'Debate Topic'
    });

    // When I first join debate - get all participants already in room
    socket.on("debate-joined", (data) => {
      console.log("Debate joined successfully. Participants:", data.participants, "Topic:", data.topic);
      
      // Update topic from server
      if (data.topic) {
        setTopic(data.topic);
      }
      
      // Handle team debate data
      if (data.debateType === 'team-debate') {
        // Organize players by team
        const forTeam = data.participants.filter(p => p.team === 'FOR');
        const againstTeam = data.participants.filter(p => p.team === 'AGAINST');
        
        setTeamFor(forTeam);
        setTeamAgainst(againstTeam);
        setTurnOrder(data.turnOrder || []);
        setCurrentTurnIndex(0);
      }
      
      if (data.participants && data.participants.length > 0) {
        // Only add if not already present
        setPlayers((prev) => {
          const ids = new Set(prev.map(p => p.userId));
          const newParticipants = data.participants.filter(p => !ids.has(p.userId));
          return [...prev, ...newParticipants];
        });
      }
    });

    socket.on("receive-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("player-joined", (data) => {
      // Handle team debate player joins
      if (data.debateType === 'team-debate') {
        const forTeam = data.participants.filter(p => p.team === 'FOR');
        const againstTeam = data.participants.filter(p => p.team === 'AGAINST');
        
        setTeamFor(forTeam);
        setTeamAgainst(againstTeam);
        setTurnOrder(data.turnOrder || []);
      }
      
      // Update players list with all participants from this event
      setPlayers((prev) => {
        if (data.participants) {
          // Replace with fresh list from server to ensure sync
          return data.participants;
        }
        // Fallback if participants not included
        const exists = prev.some(p => p.userId === data.userId);
        if (!exists) {
          return [...prev, { userId: data.userId, playerName: data.playerName }];
        }
        return prev;
      });
      console.log(`${data.playerName} joined. Total: ${data.totalParticipants}`, data.participants);
    });

    socket.on("hand-raised", (data) => {
      console.log(`${data.playerName} raised their hand`);
    });

    socket.on("timer-updated", (data) => {
      setTimer(data.timeRemaining);
    });

    socket.on("debate-ended", () => {
      handleEndDebate();
    });

    socket.on("player-disconnected", (data) => {
      // Remove player from list
      setPlayers((prev) =>
        prev.filter((p) => p.userId !== data.userId)
      );
      // Show notification
      console.log(data.message);
    });

    // Listen for speeches from other players
    socket.on("speech-received", (data) => {
      console.log(`[Speech Received] ${data.playerName}: ${data.speech.substring(0, 50)}...`);
      // Add to messages to display
      setMessages((prev) => [...prev, {
        userId: data.userId,
        playerName: data.playerName,
        text: `${data.speech} (Points: ${data.points})`,
        timestamp: data.timestamp,
        isSpokenMessage: true
      }]);
      // Add to speeches array
      setSpeeches((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive-message");
      socket.off("player-joined");
      socket.off("hand-raised");
      socket.off("timer-updated");
      socket.off("debate-ended");
      socket.off("player-disconnected");
      socket.off("speech-received");
    };
  }, [debateId]);

  useEffect(() => {
    console.log('[DebateRoom Timer Effect] isActive:', isActive, 'timer:', timer);
    
    let interval;
    
    // Start countdown only when debate is active
    if (isActive && timer > 0) {
      console.log('[DebateRoom Timer] Starting countdown from', timer);
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev - 1;
          console.log('[DebateRoom Timer] Decreased to:', newTime);
          
          // Emit timer update to server
          socket.emit("timer-update", { debateId, timeRemaining: newTime });
          
          // If time reaches 0, end the debate
          if (newTime === 0) {
            console.log('[DebateRoom Timer] Time is up!');
            // We'll handle this outside to avoid stale closure
          }
          
          return newTime;
        });
      }, 1000);
    }
    
    // Cleanup interval on unmount or when isActive changes
    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('[DebateRoom Timer] Cleared interval');
      }
    };
  }, [isActive, debateId]);

  // Separate effect to handle when timer hits 0
  useEffect(() => {
    console.log('[DebateRoom End Timer Effect] timer:', timer, 'isActive:', isActive);
    if (timer === 0 && isActive) {
      console.log('[DebateRoom End Timer] Time is up! Calling handleEndDebate');
      handleEndDebate();
    }
  }, [timer, isActive]);

  const handleStart = () => {
    console.log('[DebateRoom] Starting debate');
    setIsActive(true);
    setSpeeches([]); // Reset speeches when debate starts
    setDebateMetrics(null);
    console.log('[DebateRoom] Debate started - isActive set to true, speeches reset');
  };

  const handleTranscript = (transcriptData) => {
    console.log('[DebateRoom] handleTranscript called with:', transcriptData);
    
    // Validate transcriptData
    if (!transcriptData || !transcriptData.text) {
      console.warn('[DebateRoom] Invalid transcriptData received:', transcriptData);
      return;
    }
    
    // Add speech to list
    setSpeeches((prevSpeeches) => {
      try {
        const updatedSpeeches = [...prevSpeeches, transcriptData];
        console.log('[DebateRoom] Updated speeches count:', updatedSpeeches.length);
        console.log('[DebateRoom] Current speeches:', updatedSpeeches);
        
        // Update metrics with error handling
        const metrics = trackDebateMetrics(updatedSpeeches);
        console.log('[DebateRoom] Updated metrics:', metrics);
        setDebateMetrics(metrics);
        
        return updatedSpeeches;
      } catch (error) {
        console.error('[DebateRoom] Error updating speeches:', error);
        return prevSpeeches; // Keep previous state on error
      }
    });

    // Broadcast speech to other players
    socket.emit("send-message", {
      debateId,
      userId: user?.id,
      playerName: user?.name,
      text: `🎤 ${transcriptData.text}`,
    });
  };

  const handleSendMessage = () => {
    if (input.trim() && socket) {
      socket.emit("send-message", {
        debateId,
        userId: user?.id,
        playerName: user?.name,
        text: input,
      });
      setInput("");
    }
  };

  const handleRaiseHand = () => {
    if (socket) {
      if (handRaised) {
        socket.emit("lower-hand", {
          debateId,
          userId: user?.id,
          playerName: user?.name,
        });
      } else {
        socket.emit("raise-hand", {
          debateId,
          userId: user?.id,
          playerName: user?.name,
        });
      }
      setHandRaised(!handRaised);
    }
  };

  const handleEndDebate = async () => {
    console.log('[DebateRoom] handleEndDebate called');
    
    // ⏸️ STOP AI IMMEDIATELY
    console.log('[DebateRoom] 🛑 Stopping AI speech immediately...');
    stopSpeech();  // Stop any ongoing text-to-speech
    
    // Disable debate mode to stop all speech recognition and AI processing
    setIsActive(false);
    
    // Give a tiny delay to let the speech stop properly
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('[DebateRoom] Ending debate. Speeches:', speeches);
    console.log('[DebateRoom] Metrics:', debateMetrics);
    
    // Save speeches and metrics for result page
    if (speeches && speeches.length > 0) {
      localStorage.setItem(`speeches_${debateId}`, JSON.stringify(speeches));
      console.log(`[DebateRoom] Saved ${speeches.length} speeches to localStorage`);
    } else {
      console.warn('[DebateRoom] No speeches recorded!');
    }
    
    if (debateMetrics) {
      localStorage.setItem(`debateMetrics_${debateId}`, JSON.stringify(debateMetrics));
    }
    
    localStorage.setItem(`topic_${debateId}`, topic);
    localStorage.setItem(`roomType_${debateId}`, roomType);
    
    // Notify server that debate has ended
    socket.emit("end-debate", { debateId });
    
    // Call backend to end debate (only for backend debates, not local/demo debates)
    const isLocalDebate = debateId && debateId.startsWith('debate_');
    if (debateId && !isLocalDebate) {
      console.log('[DebateRoom] Ending backend debate:', debateId);
      await endDebate(debateId);
    } else if (isLocalDebate) {
      console.log('[DebateRoom] Skipping backend call for local debate');
    }
    
    // Navigate to results page
    console.log('[DebateRoom] ✅ Navigating to results page...');
    navigate(`/results/${debateId}`);
  };

  const handleLeaveDebate = () => {
    const confirmLeave = confirm(
      "Are you sure you want to leave this debate? You won't be able to rejoin."
    );

    if (confirmLeave) {
      // Notify other players
      socket.emit("player-left", {
        debateId,
        userId: user?.id,
        playerName: user?.name,
      });

      // Navigate back to home
      navigate("/");
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Topic - PROMINENT IN AI DEBATE */}
        <div className={`${isAIDebate ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-purple-600'} text-white p-4 md:p-6 rounded-xl mb-4 shadow-lg border-2 border-white/20`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-0">
              <h2 className={`${isAIDebate ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'} font-bold truncate`}>
                📌 {topic}
              </h2>
              <p className="text-white/90 text-xs md:text-sm mt-2">
                {isAIDebate ? "🤖 Debating against AI Opponent" : "👥 Live Debate with Players"}
              </p>
            </div>
            {isAIDebate && (
              <div className="text-4xl md:text-5xl">🤖</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content Area */}
          <div className="lg:col-span-3 flex flex-col h-full">
            {/* Timer - COMPACT at TOP (Before Animation) */}
            <div className="text-center mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl shadow-md border-2 border-blue-200">
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl md:text-4xl font-bold text-blue-600">
                  {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                </p>
                <p className="text-gray-600 text-xs font-semibold">⏱️ Time Left</p>
              </div>
            </div>

            {/* Team Display - ONLY FOR TEAM DEBATES */}
            {isTeamDebate && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-xl border-2 border-emerald-300 shadow-md">
                <p className="text-center text-sm font-bold text-gray-700 mb-3">🎪 {teamSize} Team Debate</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Team FOR */}
                  <div className={`p-3 rounded-lg border-2 transition ${
                    myTeam === 'FOR' 
                      ? 'bg-green-100 border-green-500 shadow-lg scale-105' 
                      : 'bg-gray-100 border-gray-300'
                  }`}>
                    <p className="text-xs font-bold text-green-700 mb-2">🟢 TEAM FOR</p>
                    <div className="space-y-1">
                      {teamFor.map(member => (
                        <div key={member.userId} className="text-xs text-gray-800 flex items-center gap-1">
                          <span className={turnOrder[currentTurnIndex] === member.userId ? '🎤' : '👤'}>
                          </span>
                          {member.playerName}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team AGAINST */}
                  <div className={`p-3 rounded-lg border-2 transition ${
                    myTeam === 'AGAINST' 
                      ? 'bg-red-100 border-red-500 shadow-lg scale-105' 
                      : 'bg-gray-100 border-gray-300'
                  }`}>
                    <p className="text-xs font-bold text-red-700 mb-2">🔴 TEAM AGAINST</p>
                    <div className="space-y-1">
                      {teamAgainst.map(member => (
                        <div key={member.userId} className="text-xs text-gray-800 flex items-center gap-1">
                          <span className={turnOrder[currentTurnIndex] === member.userId ? '🎤' : '👤'}>
                          </span>
                          {member.playerName}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {turnOrder.length > 0 && (
                  <div className="mt-3 p-2 bg-white rounded-lg border border-blue-300 text-center">
                    <p className="text-xs font-semibold text-blue-700">
                      Current Turn: 🎤 {
                        teamFor.find(m => m.userId === turnOrder[currentTurnIndex])?.playerName ||
                        teamAgainst.find(m => m.userId === turnOrder[currentTurnIndex])?.playerName ||
                        'Waiting...'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Animated AI Avatar - ONLY FOR AI DEBATES */}
            {isAIDebate && (
              <>
                <div className="flex items-center justify-center mb-6 mt-2">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Animated Background Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur-xl opacity-75 animate-pulse"></div>
                    
                    {/* Inner Circle with Animated Border */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-1">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                        {/* AI Avatar Icon */}
                        <div className="text-6xl animate-bounce" style={{ animationDuration: '2s' }}>
                          🤖
                        </div>
                      </div>
                    </div>

                    {/* Orbiting Elements */}
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-2 h-2 bg-blue-400 rounded-full"></div>
                      <div className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-2 w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-2 w-2 h-2 bg-pink-400 rounded-full"></div>
                    </div>

                    {/* Thinking Indicator */}
                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                      <div className="flex gap-1 items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Text for AI Debates */}
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-gray-800">🎤 Ready to debate?</p>
                  <p className="text-sm text-gray-600">Click the microphone to speak with AI</p>
                </div>
              </>
            )}

            {/* Video Stream Component - ONLY FOR USER DEBATES */}
            {!isAIDebate && (
              <div className="bg-white rounded-xl shadow-md p-4 mb-4 border-2 border-gray-200">
                <VideoStream
                  debateId={debateId}
                  userId={user?.id}
                  playerName={user?.name}
                  isAIDebate={isAIDebate}
                  participants={players}
                />
              </div>
            )}

            {/* Advanced Speech Recognition Component */}
            {/* ⚡ Only show for AI Debate rooms */}
            {isAIDebate && (
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-4 mb-4 border-2 border-green-200 flex-1">
              <AdvancedSpeechRecognition
                isActive={isActive}
                debateId={debateId}
                topic={topic}
                onSpeechEnd={handleTranscript}
                socket={socket}
                roomType={roomType}
              />
              </div>
            )}

            {/* User-Only Debate Instructions */}
            {!isAIDebate && isActive && (
              <div className="bg-blue-50 rounded-xl shadow-md p-4 mb-4 border-2 border-blue-300">
                <p className="text-center text-blue-700 font-semibold">🎤 Speak directly - your voice will be heard by other participants in real-time</p>
              </div>
            )}

            {/* Message Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={!isActive}
                placeholder={
                  isActive ? "Type your argument..." : "Start the debate to send messages"
                }
                className="flex-1 px-3 py-2 text-sm border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSendMessage}
                disabled={!isActive}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 text-sm rounded-lg font-semibold transition shadow-md"
              >
                Send
              </button>
            </div>

            {/* Control Buttons - BOTTOM (Full Width, Better Spacing) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              {!isActive ? (
                <button
                  onClick={handleStart}
                  className="col-span-1 md:col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-3 rounded-lg font-bold text-sm transition shadow-lg transform hover:scale-105"
                >
                  🎬 Start Debate
                </button>
              ) : (
                <button
                  onClick={handleEndDebate}
                  className="col-span-1 md:col-span-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white py-3 rounded-lg font-bold text-sm transition shadow-lg transform hover:scale-105"
                >
                  🛑 End Debate
                </button>
              )}
              {!isAIDebate && (
                <button
                  onClick={handleRaiseHand}
                  className={`col-span-1 py-3 rounded-lg font-bold text-white transition shadow-md text-sm transform hover:scale-105 ${
                    handRaised
                      ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
                  }`}
                >
                  <span>{handRaised ? "👋" : "✋"}</span>
                </button>
              )}
              <button
                onClick={handleLeaveDebate}
                className="col-span-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-3 rounded-lg font-bold text-sm transition shadow-md transform hover:scale-105"
              >
                🚪 Leave
              </button>
            </div>
          </div>

          {/* Sidebar - Players & Info */}
          <div className="lg:col-span-1">
            {/* Players List & Live Leaderboard */}
            <div className="bg-white rounded-lg shadow p-3 mb-3 sticky top-6">
              <h3 className="font-semibold text-sm mb-2">👥 Participants {!isAIDebate && isActive && '(Live Leaderboard)'}</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {/* You */}
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border-2 border-green-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.[0] || "?"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">You</p>
                    <p className="text-xs text-gray-600">
                      {user?.name}
                    </p>
                  </div>
                  {/* Show points for user-only debates */}
                  {!isAIDebate && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded font-bold">
                      {Math.max(0, speeches.filter(s => s.speaker === "user").reduce((sum, s) => sum + (s.points || 0), 0))} pts
                    </span>
                  )}
                  <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                    Online
                  </span>
                </div>

                {/* Other Players / AI Opponent */}
                {isAIDebate ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      🤖
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">AI Opponent</p>
                      <p className="text-xs text-gray-600">Artificial Intelligence</p>
                    </div>
                    {/* Show AI points */}
                    <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                      {Math.max(0, speeches.filter(s => s.speaker === "ai").reduce((sum, s) => sum + (s.points || 0), 0))} pts
                    </span>
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                      Online
                    </span>
                  </div>
                ) : players.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Waiting for other players...
                  </p>
                ) : (
                  players.map((player, idx) => {
                    // Calculate points for this player (from speeches)
                    const playerPoints = Math.max(0, speeches.filter(s => s.speaker === player.playerName).reduce((sum, s) => sum + (s.points || 0), 0));
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {player.playerName?.[0] || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{player.playerName || "Player"}</p>
                          <p className="text-xs text-gray-600">Participant</p>
                        </div>
                        {/* Show live points in user-only debates */}
                        {!isAIDebate && (
                          <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                            {playerPoints} pts
                          </span>
                        )}
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                          Online
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Debate Status */}
            <div className="bg-white rounded-lg shadow p-3 mb-3">
              <h3 className="font-semibold text-sm mb-2">📊 Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={` font-semibold ${isActive ? "text-green-600" : "text-orange-600"}`}>
                    {isActive ? "🔴 Live" : "⏸️ Paused"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span className="font-semibold">{players.length + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-semibold">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hand Raised:</span>
                  <span className="font-semibold">{handRaised ? "✅ Yes" : "❌ No"}</span>
                </div>
              </div>
            </div>

            {/* Leave Debate Button - Sidebar */}
            <button
              onClick={handleLeaveDebate}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>Leave Debate</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}