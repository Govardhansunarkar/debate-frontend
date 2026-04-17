import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { endDebate } from "../services/api";
import { stopSpeech } from "../services/aiDebateService";
import { socket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import VideoStream from "../components/VideoStream";
import AdvancedSpeechRecognition from "../components/AdvancedSpeechRecognition";
import { FiClock, FiCpu, FiFlag, FiLogOut, FiPlay, FiUsers } from "react-icons/fi";
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

  useEffect(() => {
    if (speeches.length === 0) {
      setDebateMetrics(null);
      return;
    }
    setDebateMetrics(trackDebateMetrics(speeches));
  }, [speeches]);

  useEffect(() => {
    if (!debateId) return;

    localStorage.setItem(`speeches_${debateId}`, JSON.stringify(speeches));
    localStorage.setItem(`topic_${debateId}`, topic);
    localStorage.setItem(`roomType_${debateId}`, roomType);

    if (debateMetrics) {
      localStorage.setItem(`debateMetrics_${debateId}`, JSON.stringify(debateMetrics));
    }
  }, [debateId, speeches, topic, roomType, debateMetrics]);

  const handleStart = () => {
    setIsActive(true);
    setTimer(300);
    setSpeeches([]);
    setDebateMetrics(null);
    socket.emit("start-debate", { debateId, userId: user?.id, playerName: user?.name });
  };

  const handleTranscript = (transcriptData) => {
    if (!transcriptData || !transcriptData.text) return;

    setSpeeches((prev) => [...prev, transcriptData]);

    socket.emit("send-message", {
      debateId,
      userId: user?.id,
      playerName: user?.name,
      text: `Speech: ${transcriptData.text}`,
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 p-4 md:p-6 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/95 border border-sky-100 p-6 rounded-2xl mb-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium tracking-widest uppercase ${isAIDebate ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'} mb-2`}>
                {isAIDebate ? <FiCpu className="h-3 w-3" /> : <FiUsers className="h-3 w-3" />}
                {isAIDebate ? 'AI debate mode' : 'Multiplayer match'}
              </span>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">{topic}</h1>
            </div>
            {isAIDebate && <div className="text-slate-500"><FiCpu className="h-8 w-8" /></div>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/95 p-4 rounded-2xl border border-sky-100 flex flex-col items-center justify-center shadow-sm">
                 <span className="text-[10px] font-medium text-slate-500 tracking-[3px] uppercase inline-flex items-center gap-2"><FiClock className="h-3 w-3" /> Time remaining</span>
                 <span className="text-4xl font-mono font-semibold text-slate-900">
                  {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
              
              {isTeamDebate && (
                <div className="bg-white/95 p-4 rounded-2xl border border-violet-100 flex items-center justify-around shadow-sm">
                   <div className="text-center">
                     <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Team for</p>
                     <p className="text-lg font-semibold text-slate-900">{teamFor.length}</p>
                   </div>
                   <div className="h-8 w-px bg-slate-200"></div>
                   <div className="text-center">
                     <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Team against</p>
                     <p className="text-lg font-semibold text-slate-900">{teamAgainst.length}</p>
                   </div>
                </div>
              )}
            </div>

            <div className={`bg-white/80 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden ${isAIDebate ? 'min-h-[500px]' : 'h-[600px]'}`}>
              {/* Mandatory Start Overlay for ALL room types when not active */}
              {!isActive && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                   <div className="mb-8">
                     <p className="text-sm font-medium text-slate-700 tracking-[8px] uppercase mb-2">Awaiting session</p>
                     <p className="text-[10px] text-slate-500 uppercase font-medium tracking-widest">System ready for debate sequence</p>
                   </div>
                   <button
                     onClick={handleStart}
                     className="px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-medium text-lg shadow-sm transition-all hover:scale-[1.01] active:scale-95 flex flex-col items-center gap-1 group"
                   >
                     <span className="inline-flex items-center gap-2"><FiPlay className="h-4 w-4" /> Start debate</span>
                     <span className="text-[10px] opacity-70 group-hover:opacity-100 tracking-[3px]">Click to begin</span>
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
                <div className="h-full relative bg-white/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-full">
                    {players.map((player) => (
                      <div key={player.userId} className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-white shadow-sm">
                        <VideoStream player={player} isMe={player.userId === user?.id} />
                        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-lg border border-slate-200 shadow-sm group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-800">{player.playerName}</p>
                        </div>
                      </div>
                    ))}
                    {players.length === 1 && (
                      <div className="border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 bg-white/50">
                        <span className="text-[10px] font-medium uppercase tracking-widest animate-pulse">Waiting for challenger...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6 justify-center flex-wrap">
              {isActive && (
                <button onClick={handleEndDebate} className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-medium text-xs tracking-widest uppercase shadow-sm transition-all inline-flex items-center gap-2">
                  <FiFlag className="h-4 w-4" /> End Session
                </button>
              )}
              {!isAIDebate && (
                <button onClick={handleRaiseHand} className={`px-8 py-3 rounded-xl font-medium text-xs tracking-widest uppercase border transition-all ${handRaised ? 'bg-amber-500 text-white border-amber-400 shadow-sm' : 'bg-white text-slate-600 border-amber-100 shadow-sm hover:bg-amber-50'}`}>
                  {handRaised ? 'Lower Hand' : 'Raise Hand'}
                </button>
              )}
              <button onClick={handleLeaveDebate} className="px-8 py-3 bg-white hover:bg-rose-50 text-slate-700 rounded-xl font-medium text-xs tracking-widest uppercase shadow-sm border border-rose-100 transition-all inline-flex items-center gap-2">
                <FiLogOut className="h-4 w-4" /> Exit
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white/95 rounded-3xl p-6 border border-sky-100 shadow-sm h-full sticky top-6">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <h3 className="text-xs font-medium tracking-[3px] uppercase text-slate-500">The roster</h3>
                <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-orange-400'}`}></div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-100 shadow-sm">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-semibold text-white uppercase">{user?.name?.[0]?.toUpperCase() || 'Y'}</div>
                      <div>
                        <p className="text-xs font-medium text-slate-900">{user?.name || 'You'}</p>
                        <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest">Arena prime</p>
                      </div>
                   </div>
                </div>

                {isAIDebate ? (
                  <div className="bg-violet-50/60 p-4 rounded-2xl border border-violet-100 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white"><FiCpu className="h-4 w-4" /></div>
                        <div>
                          <p className="text-xs font-medium text-slate-900">SkillForce AI</p>
                          <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest">Opponent</p>
                        </div>
                    </div>
                  </div>
                ) : (
                  players.filter(p => p.userId !== user?.id).map((p, i) => (
                    <div key={i} className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center font-semibold text-white uppercase">{p.playerName?.[0]?.toUpperCase() || 'P'}</div>
                          <div>
                            <p className="text-xs font-medium text-slate-900">{p.playerName}</p>
                            <p className="text-[8px] text-slate-500 font-medium uppercase tracking-widest">Challenger</p>
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
