import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    // Generate or retrieve user ID
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("userId", userId);
    }
  }, []);

  const handleStart = (mode) => {
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName);
      if (mode === "random") navigate("/random-match");
      else if (mode === "private") navigate("/private-room");
      else if (mode === "ai") navigate("/ai-debate");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          🎤 AI Debate Arena
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Master communication & critical thinking through structured debates with real opponents and AI analysis
        </p>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Enter your name..."
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleStart('random')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleStart('random')}
            disabled={!playerName.trim()}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition flex flex-col items-center gap-2"
          >
            <span className="text-2xl">🎲</span>
            <span>Random Match</span>
            <span className="text-xs">Auto-matchmaking</span>
          </button>

          <button
            onClick={() => handleStart('private')}
            disabled={!playerName.trim()}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition flex flex-col items-center gap-2"
          >
            <span className="text-2xl">🏠</span>
            <span>Private Room</span>
            <span className="text-xs">Invite friends</span>
          </button>

          <button
            onClick={() => handleStart('ai')}
            disabled={!playerName.trim()}
            className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition flex flex-col items-center gap-2"
          >
            <span className="text-2xl">🤖</span>
            <span>AI Debate</span>
            <span className="text-xs">Practice mode</span>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>💪 Improve your debating skills | 🧠 Get AI-powered feedback | 🏆 Track your progress</p>
        </div>
      </div>
    </div>
  );
}