import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function RandomMatch() {
  const [loading, setLoading] = useState(false);
  const [waitTime, setWaitTime] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on("match-found", (data) => {
      setLoading(false);
      navigate(`/debate-room/${data.debateId}`);
    });

    return () => {
      socket.off("match-found");
    };
  }, [navigate]);

  const handleJoinRandom = () => {
    setLoading(true);
    setWaitTime(0);

    const userId = localStorage.getItem("userId");
    const playerName = localStorage.getItem("playerName");

    socket.emit("join-queue", { userId, playerName });

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
        <p className="text-gray-600 mb-8">
          Get matched with a random opponent for a 5-minute structured debate
        </p>

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
              💡 Tip: You'll be matched with another player at your skill level. Each debate lasts 5 minutes with AI-powered feedback at the end.
            </p>
          </>
        )}
      </div>
    </div>
  );
}