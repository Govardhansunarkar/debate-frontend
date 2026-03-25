import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import { validateTopic } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function AIDebate() {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [debateStarted, setDebateStarted] = useState(false);
  const [debateId, setDebateId] = useState("");
  const [topicError, setTopicError] = useState("");
  const [topicValidating, setTopicValidating] = useState(false);
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
      setTopicError("Please select or enter a topic");
      return;
    }

    setTopicError("");
    
    // Check if it's a SUGGESTED TOPIC (pre-approved) - skip validation
    const isSuggestedTopic = suggestedTopics.includes(topic.trim());
    
    if (!isSuggestedTopic) {
      // Only validate CUSTOM/USER-ENTERED topics
      setTopicValidating(true);
      console.log('[AIDebate] Custom topic - validating with AI:', topic);
      const validation = await validateTopic(topic);
      console.log('[AIDebate] Validation result:', validation);

      if (!validation.success || !validation.isValid) {
        setTopicError(validation.reason || "❌ This topic is not suitable for debate. Choose a different topic.");
        if (validation.suggestion) {
          setTopicError(prev => prev + "\n\n💡 " + validation.suggestion);
        }
        setTopicValidating(false);
        return;
      }

      setTopicValidating(false);
    } else {
      console.log('[AIDebate] Suggested topic - skipping validation:', topic);
    }

    setLoading(true);
    
    try {
      // Generate a simple debate ID (in real app, backend would do this)
      const debateId = `debate_${Date.now()}`;
      
      setDebateId(debateId);
      setDebateStarted(true);
      
      // Navigate to debate room after a short delay
      setTimeout(() => {
        const encodedTopic = encodeURIComponent(topic);
        navigate(`/debate-room/${debateId}?ai=true&topic=${encodedTopic}`);
      }, 1500);
    } catch (error) {
      console.error(error);
      setTopicError("Error starting debate - please try again");
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
                  onClick={() => {
                    setTopic(t);
                    setTopicError("");
                  }}
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
                onChange={(e) => {
                  setTopic(e.target.value);
                  setTopicError("");
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 transition ${
                  topicError ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
              />
              {topicError && (
                <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{topicError}</p>
                </div>
              )}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartDebate}
            disabled={loading || topicValidating || !topic.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold text-lg"
          >
            {topicValidating ? "✓ Validating topic..." : loading ? "Starting Debate..." : "Start Debate 🎬"}
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
