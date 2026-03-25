import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function RandomMatch() {
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

    const userId = localStorage.getItem("userId");
    const playerName = localStorage.getItem("playerName");

    console.log('[RandomMatch] Joining queue with type:', debateType, 'topic:', selectedTopic);

    socket.emit("join-queue", { 
      userId, 
      playerName,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <h2 className="text-4xl font-bold mb-4">🎲 Random Match</h2>
        <p className="text-gray-600 mb-6">
          Get matched with random opponents for a debate
        </p>

        {/* Debate Type Selection */}
        {!loading && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
            <p className="text-sm font-semibold text-gray-700 mb-3">🎯 Choose Debate Type:</p>
            <div className="space-y-2">
              <button
                onClick={() => setDebateType("regular")}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                  debateType === "regular"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                👥 1v1 Debate (You vs 1 Opponent)
              </button>
              <button
                onClick={() => setDebateType("team")}
                className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                  debateType === "team"
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                🎪 Team Debate (2v2 or 3v3)
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              {debateType === "regular" 
                ? "⏱️ Wait ~30s for opponent, then 5-min debate" 
                : "⏱️ Wait for 4-6 players, then divide into teams"}
            </p>
          </div>
        )}

        {/* Display the randomly selected topic */}
        {selectedTopic && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">📌 <strong>Debate Topic:</strong></p>
            <p className="text-lg font-bold text-blue-700">{selectedTopic}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="text-lg text-gray-700 font-semibold">
              🔍 Searching for {debateType === "team" ? "team" : "opponent"}...
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
            </div>
            <div className="text-4xl font-bold text-blue-600">{waitTime}s</div>
            <p className="text-sm text-gray-500">
              {debateType === "team" 
                ? "Waiting for 4+ players to form teams..." 
                : "Average wait: ~30 seconds"}
            </p>
            <button
              onClick={() => {
                setLoading(false);
                socket.emit("leave-queue");
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleJoinRandom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-bold text-lg transition transform hover:scale-105"
            >
              🚀 Find Match
            </button>
            <p className="mt-6 text-sm text-gray-500">
              💡 Tip: {debateType === "team" 
                ? "Teams will be randomly assigned to FOR 🟢 or AGAINST 🔴 positions. Each team member speaks in turn."
                : "You'll debate this topic with another player. Each debate lasts 5 minutes with AI-powered feedback at the end."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}