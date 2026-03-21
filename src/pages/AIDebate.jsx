import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";

export default function AIDebate() {
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [debateStarted, setDebateStarted] = useState(false);
  const [debateId, setDebateId] = useState("");
  const navigate = useNavigate();

  const difficulties = [
    { level: "easy", emoji: "🟢", description: "AI beginner" },
    { level: "medium", emoji: "🟡", description: "AI intermediate" },
    { level: "hard", emoji: "🔴", description: "AI expert" },
  ];

  const suggestedTopics = [
    "Should social media be regulated?",
    "Is artificial intelligence beneficial to society?",
    "Should we have a 4-day work week?",
    "Is climate change the most urgent issue?",
    "Should privacy be more protected than security?",
    "Is remote work more productive than office work?",
  ];

  const handleStartDebate = async () => {
    if (!topic.trim()) {
      alert("Please select or enter a topic");
      return;
    }

    setLoading(true);
    
    try {
      // Generate a simple debate ID (in real app, backend would do this)
      const debateId = `debate_${Date.now()}`;
      
      setDebateId(debateId);
      setDebateStarted(true);
      
      // Navigate to debate room after a short delay
      setTimeout(() => {
        navigate(`/debate-room/${debateId}?ai=true`);
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Error starting debate");
    }

    setLoading(false);
  };

  if (debateStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-3xl font-bold mb-6">🤖 Debate Starting</h2>
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Your AI opponent is being prepared...</p>
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500">Transferring you to the debate room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 to-red-700 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">🤖 Debate with AI</h1>

        <div className="bg-white rounded-lg shadow-2xl p-8 mb-6">
          {/* Difficulty Selection */}
          <h2 className="text-2xl font-bold mb-4">Choose Difficulty</h2>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {difficulties.map((d) => (
              <button
                key={d.level}
                onClick={() => setDifficulty(d.level)}
                className={`p-4 rounded-lg font-semibold transition ${
                  difficulty === d.level
                    ? "bg-orange-500 text-white ring-2 ring-orange-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <div className="text-2xl mb-2">{d.emoji}</div>
                <div>{d.level}</div>
                <div className="text-xs">{d.description}</div>
              </button>
            ))}
          </div>

          {/* Topic Selection */}
          <h2 className="text-2xl font-bold mb-4">Choose Topic</h2>
          <div className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {suggestedTopics.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setTopic(t)}
                  className={`p-3 rounded-lg text-left text-sm transition ${
                    topic === t
                      ? "bg-blue-500 text-white ring-2 ring-blue-300"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Custom Topic */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Or enter your own topic:</p>
              <input
                type="text"
                placeholder="Enter a debate topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDebate}
            disabled={loading || !topic.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold text-lg"
          >
            {loading ? "Starting Debate..." : "Start Debate 🎬"}
          </button>
        </div>

        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <p className="text-sm text-gray-700">
            💡 <strong>Tip:</strong> The AI will challenge your arguments and provide constructive feedback at the end!
          </p>
        </div>
      </div>
    </div>
  );
}
