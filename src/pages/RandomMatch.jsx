import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function RandomMatch() {
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState("");
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
      navigate(`/debate-room/${data.debateId}?topic=${encodedTopic}`);
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

    console.log('[RandomMatch] Joining queue with topic:', selectedTopic);

    socket.emit("join-queue", { 
      userId, 
      playerName,
      topic: selectedTopic  // Send topic to backend
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
          Get matched with a random opponent for a 5-minute structured debate
        </p>

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
              🔍 Searching for opponent...
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-500"></div>
            </div>
            <div className="text-4xl font-bold text-blue-600">{waitTime}s</div>
            <p className="text-sm text-gray-500">Average wait: ~30 seconds</p>
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
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-bold text-lg transition transform hover:scale-105"
            >
              🚀 Find Opponent
            </button>
            <p className="mt-6 text-sm text-gray-500">
              💡 Tip: You'll debate this topic with another player. Each debate lasts 5 minutes with AI-powered feedback at the end.
            </p>
          </>
        )}
      </div>
    </div>
  );
}