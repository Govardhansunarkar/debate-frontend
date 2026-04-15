import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import { useAuth } from "../contexts/AuthContext";
import { FiClock, FiLoader, FiPlay, FiSearch, FiShuffle, FiTarget, FiUsers, FiXCircle } from "react-icons/fi";

export default function RandomMatch() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [debateType, setDebateType] = useState("regular"); // 'regular' or 'team'
  const navigate = useNavigate();

  // List of debate topics for random matching
  const debateTopics = [
    "Should social media be regulated by government?",
    "Is artificial intelligence beneficial to society?",
    "Should we have a 4-day work week?",
    "Is climate change the most urgent issue facing humanity?",
    "Should privacy be prioritized over national security?",
    "Is remote work more productive than office work?",
    "Should corporations pay higher taxes?",
    "Is universal healthcare better than private healthcare?",
    "Should autonomous vehicles be allowed on public roads?",
    "Is traditional education better than online education?",
    "Should we colonize other planets?",
    "Is animal testing justified for medical research?",
    "Should single-use plastics be banned?",
    "Is cryptocurrency the future of finance?",
    "Should there be term limits for politicians?"
  ];

  useEffect(() => {
    // Select a random topic when component mounts
    const randomTopic = debateTopics[Math.floor(Math.random() * debateTopics.length)];
    setSelectedTopic(randomTopic);
    console.log('[RandomMatch] Selected random topic:', randomTopic);
  }, []);

  useEffect(() => {
    socket.on("match-found", (data) => {
      setLoading(false);
      // Pass the topic in the URL when navigating to debate room
      const encodedTopic = encodeURIComponent(selectedTopic);
      
      // For team debates, pass additional info
      if (data.matchType === 'team') {
        navigate(`/debate-room/${data.debateId}?topic=${encodedTopic}&matchType=team&teamSize=${data.teamSize}&teamAssignment=${data.teamAssignment.position}`);
      } else {
        navigate(`/debate-room/${data.debateId}?topic=${encodedTopic}`);
      }
    });

    return () => {
      socket.off("match-found");
    };
  }, [navigate, selectedTopic]);

  const handleJoinRandom = () => {
    setLoading(true);
    setWaitTime(0);

    console.log('[RandomMatch] Joining queue with type:', debateType, 'topic:', selectedTopic);

    socket.emit("join-queue", { 
      userId: user?.id, 
      playerName: user?.name,
      topic: selectedTopic,
      debateType: debateType // Pass debate type
    });

    // Simulate wait time
    const timer = setInterval(() => {
      setWaitTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-sky-100 bg-white/95 p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <FiShuffle className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-semibold text-slate-900 mb-3">Random match</h2>
          <p className="text-slate-600">Get matched with random opponents for a debate.</p>
        </div>

        {!loading && (
          <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50/70 p-4">
            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <FiTarget className="h-4 w-4" /> Choose debate type
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setDebateType("regular")}
                className={`w-full rounded-xl border px-4 py-3 text-left font-medium transition ${
                  debateType === "regular"
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-sky-100 bg-white text-slate-700 hover:bg-sky-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FiUsers className="h-4 w-4" /> 1v1 debate
                </span>
              </button>
              <button
                onClick={() => setDebateType("team")}
                className={`w-full rounded-xl border px-4 py-3 text-left font-medium transition ${
                  debateType === "team"
                    ? "border-violet-500 bg-violet-500 text-white"
                    : "border-violet-100 bg-white text-slate-700 hover:bg-violet-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FiUsers className="h-4 w-4" /> Team debate
                </span>
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500 flex items-center gap-2">
              <FiClock className="h-3.5 w-3.5" />
              {debateType === "regular"
                ? "Wait for one opponent, then start the debate."
                : "Wait for 4 to 6 players, then split into teams."}
            </p>
          </div>
        )}

        {selectedTopic && (
          <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-sm font-medium text-slate-500 mb-2">Debate topic</p>
            <p className="text-lg font-semibold text-slate-900">{selectedTopic}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6 text-center">
            <div className="text-base text-slate-700 font-medium flex items-center justify-center gap-2">
              <FiSearch className="h-4 w-4" /> Searching for {debateType === "team" ? "team" : "opponent"}
            </div>
            <div className="flex justify-center">
              <FiLoader className="h-12 w-12 animate-spin text-sky-600" />
            </div>
            <div className="text-4xl font-semibold text-slate-900">{waitTime}s</div>
            <p className="text-sm text-slate-500">
              {debateType === "team"
                ? "Waiting for enough players to form teams."
                : "Average wait is around 30 seconds."}
            </p>
            <button
              onClick={() => {
                setLoading(false);
                socket.emit("leave-queue");
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-medium text-rose-700 hover:bg-rose-100 transition"
            >
              <FiXCircle className="h-4 w-4" /> Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleJoinRandom}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-4 font-medium text-white transition hover:from-sky-600 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-400"
            >
              <FiPlay className="h-4 w-4" /> Find match
            </button>
            <p className="mt-5 text-sm text-slate-500 leading-relaxed">
              {debateType === "team"
                ? "Teams will be assigned automatically to one side of the debate."
                : "You'll debate one opponent, then review feedback at the end."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}