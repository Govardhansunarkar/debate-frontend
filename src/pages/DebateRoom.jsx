import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { endDebate } from "../services/api";
import { stopSpeech } from "../services/aiDebateService";
import { socket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import VideoStream from "../components/VideoStream";
import AdvancedSpeechRecognition from "../components/AdvancedSpeechRecognition";
import { trackDebateMetrics } from "../services/debateAnalysis";

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
  const [roomType, setRoomType] = useState('user-only');
  const [speeches, setSpeeches] = useState([]);
  const [debateMetrics, setDebateMetrics] = useState(null);
  
  const [isTeamDebate, setIsTeamDebate] = useState(false);
  const [teamSize, setTeamSize] = useState(null);
  const [myTeam, setMyTeam] = useState(null);
  const [teamFor, setTeamFor] = useState([]);
  const [teamAgainst, setTeamAgainst] = useState([]);
  const [turnOrder, setTurnOrder] = useState([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isAI = params.get('ai') === 'true';
    const topicFromUrl = params.get('topic');
    const matchType = params.get('matchType');
    const teamSizeFromUrl = params.get('teamSize');
    const teamAssignmentFromUrl = params.get('teamAssignment');
    
    setIsAIDebate(isAI);
    if (topicFromUrl) setTopic(decodeURIComponent(topicFromUrl));
    
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
      team: teamAssignmentFromUrl || null,
      topic: topicFromUrl ? decodeURIComponent(topicFromUrl) : 'Debate Topic'
    });

    socket.on("debate-joined", (data) => {
      if (data.topic) setTopic(data.topic);
      if (data.debateType === 'team-debate') {
        setTeamFor(data.participants.filter(p => p.team === 'FOR'));
        setTeamAgainst(data.participants.filter(p => p.team === 'AGAINST'));
        setTurnOrder(data.turnOrder || []);
        setCurrentTurnIndex(0);
      }
      if (data.participants) {
        setPlayers(data.participants);
      }
    });

    socket.on("receive-message", (data) => setMessages((prev) => [...prev, data]));

    socket.on("player-joined", (data) => {
      if (data.debateType === 'team-debate') {
        setTeamFor(data.participants.filter(p => p.team === 'FOR'));
        setTeamAgainst(data.participants.filter(p => p.team === 'AGAINST'));
        setTurnOrder(data.turnOrder || []);
      }
      setPlayers(data.participants || []);
    });

    socket.on("timer-updated", (data) => setTimer(data.timeRemaining));
    socket.on("debate-ended", () => handleEndDebate());
    socket.on("debate-started", () => {
      setIsActive(true);
      setTimer(300);
    });

    socket.on("player-disconnected", (data) => {
      setPlayers((prev) => prev.filter((p) => p.userId !== data.userId));
    });

    socket.on("speech-received", (data) => {
      setMessages((prev) => [...prev, {
        userId: data.userId,
        playerName: data.playerName,
        text: `${data.speech} (Points: ${data.points})`,
        timestamp: data.timestamp,
        isSpokenMessage: true
      }]);
      setSpeeches((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive-message");
      socket.off("player-joined");
      socket.off("timer-updated");
      socket.off("debate-ended");
      socket.off("player-disconnected");
      socket.off("speech-received");
    };
  }, [debateId, user?.id, user?.name]);

  useEffect(() => {
    let interval;
    if (isActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          const newTime = prev - 1;
          socket.emit("timer-update", { debateId, timeRemaining: newTime });
          return newTime;
        });
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [isActive, debateId, timer]);

  useEffect(() => {
    if (timer === 0 && isActive) handleEndDebate();
  }, [timer, isActive]);

  const handleStart = () => {
    setIsActive(true);
    setTimer(300);
    setSpeeches([]);
    setDebateMetrics(null);
    socket.emit("start-debate", { debateId, userId: user?.id, playerName: user?.name });
  };

  const handleTranscript = (transcriptData) => {
    if (!transcriptData || !transcriptData.text) return;
    setSpeeches((prev) => {
      const updated = [...prev, transcriptData];
      const metrics = trackDebateMetrics(updated);
      setDebateMetrics(metrics);
      return updated;
    });
    socket.emit("send-message", {
      debateId,
      userId: user?.id,
      playerName: user?.name,
      text: `🎤 ${transcriptData.text}`,
    });
  };

  const handleSendMessage = () => {
    if (input.trim() && socket) {
      socket.emit("send-message", { debateId, userId: user?.id, playerName: user?.name, text: input });
      setInput("");
    }
  };

  const handleRaiseHand = () => {
    if (socket) {
      socket.emit(handRaised ? "lower-hand" : "raise-hand", { debateId, userId: user?.id, playerName: user?.name });
      setHandRaised(!handRaised);
    }
  };

  const handleEndDebate = async () => {
    stopSpeech();
    setIsActive(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (speeches?.length > 0) localStorage.setItem(`speeches_${debateId}`, JSON.stringify(speeches));
    if (debateMetrics) localStorage.setItem(`debateMetrics_${debateId}`, JSON.stringify(debateMetrics));
    localStorage.setItem(`topic_${debateId}`, topic);
    localStorage.setItem(`roomType_${debateId}`, roomType);
    
    socket.emit("end-debate", { debateId });
    if (debateId && !debateId.startsWith('debate_')) await endDebate(debateId);
    navigate(`/results/${debateId}`);
  };

  const handleLeaveDebate = () => {
    if (confirm("Are you sure you want to leave?")) {
      socket.emit("player-left", { debateId, userId: user?.id, playerName: user?.name });
      navigate("/");
    }
  };

  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 md:p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl border-4 border-white/30 p-6 rounded-3xl mb-6 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${isAIDebate ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} mb-2 inline-block`}>
                {isAIDebate ? '🤖 AI Debate Mode' : '👥 Multiplayer Match'}
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-800">{topic}</h1>
            </div>
            {isAIDebate && <div className="text-4xl">🤖</div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border-2 border-white/50 flex flex-col items-center justify-center shadow-lg">
                <span className="text-[10px] font-black text-gray-400 tracking-[3px] uppercase">Time Remaining</span>
                <span className="text-4xl font-mono font-black text-blue-600">
                  {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
              
              {isTeamDebate && (
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border-2 border-white/50 flex items-center justify-around shadow-lg">
                   <div className="text-center">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Team For</p>
                      <p className="text-lg font-black text-gray-800">{teamFor.length}</p>
                   </div>
                   <div className="h-8 w-px bg-gray-200"></div>
                   <div className="text-center">
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Team Against</p>
                      <p className="text-lg font-black text-gray-800">{teamAgainst.length}</p>
                   </div>
                </div>
              )}
            </div>

            <div className={`bg-gray-100 rounded-3xl border-8 border-white shadow-2xl relative overflow-hidden ${isAIDebate ? 'min-h-[500px]' : 'h-[600px]'}`}>
              {/* Mandatory Start Overlay for ALL room types when not active */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                   <div className="mb-8">
                     <p className="text-sm font-black text-blue-600 tracking-[8px] uppercase mb-2">Awaiting Session</p>
                     <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">System ready for debate sequence</p>
                   </div>
                   <button
                     onClick={handleStart}
                     className="px-16 py-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-3xl font-black text-3xl shadow-2xl transition-all hover:scale-105 active:scale-95 border-b-8 border-black/20 flex flex-col items-center gap-1 group"
                   >
                     <span>START DEBATE ⚡</span>
                     <span className="text-[10px] opacity-70 group-hover:opacity-100 tracking-[3px]">CLICK TO BEGIN</span>
                   </button>
                </div>
              )}

              {isAIDebate ? (
                <AdvancedSpeechRecognition
                  isActive={isActive}
                  debateId={debateId}
                  topic={topic}
                  socket={socket}
                  roomType="ai"
                  onSpeechEnd={handleTranscript}
                />
              ) : (
                <div className="h-full relative bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
                    {players.map((player) => (
                      <div key={player.userId} className="relative rounded-2xl overflow-hidden border-4 border-white group bg-white shadow-md">
                        <VideoStream player={player} isMe={player.userId === user?.id} />
                        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-lg border border-gray-100 shadow-lg group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-800">{player.playerName}</p>
                        </div>
                      </div>
                    ))}
                    {players.length === 1 && (
                      <div className="border-4 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 bg-white/50">
                        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Waiting for challenger...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6 justify-center flex-wrap">
              {isActive && (
                <button onClick={handleEndDebate} className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs tracking-widest uppercase shadow-lg transition-all">
                  🛑 End Session
                </button>
              )}
              {!isAIDebate && (
                <button onClick={handleRaiseHand} className={`px-8 py-3 rounded-xl font-black text-xs tracking-widest uppercase italic border-2 transition-all ${handRaised ? 'bg-orange-500 text-white border-orange-400 shadow-lg' : 'bg-white text-gray-600 border-gray-100 shadow-md'}`}>
                  {handRaised ? '✋ Lower Hand' : '🙋 Raise Hand'}
                </button>
              )}
              <button onClick={handleLeaveDebate} className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-black text-xs tracking-widest uppercase italic shadow-md transition-all">
                🚪 Exit
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 border-4 border-white shadow-2xl h-full sticky top-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-gray-100">
                <h3 className="text-xs font-black tracking-[3px] uppercase text-gray-400">The Roster</h3>
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 shadow-sm">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white uppercase">{user?.name?.[0]?.toUpperCase() || 'Y'}</div>
                      <div>
                        <p className="text-xs font-black text-gray-800">{user?.name || 'You'}</p>
                        <p className="text-[8px] text-blue-600 font-bold uppercase tracking-widest">Arena Prime</p>
                      </div>
                   </div>
                </div>

                {isAIDebate ? (
                  <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl">🤖</div>
                        <div>
                          <p className="text-xs font-black text-gray-800">SKILLFORCE AI</p>
                          <p className="text-[8px] text-purple-400 font-bold uppercase tracking-widest">Antagonist</p>
                        </div>
                    </div>
                  </div>
                ) : (
                  players.filter(p => p.userId !== user?.id).map((p, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white uppercase">{p.playerName?.[0]?.toUpperCase() || 'P'}</div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{p.playerName}</p>
                            <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">Challenger</p>
                          </div>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
