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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-white/30">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-6">🤖 Debate Starting</h2>
          <div className="mb-6">
            <p className="text-gray-600 mb-4 font-semibold">Your AI opponent is being prepared...</p>
            <div className="inline-block relative">
              <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-20"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 font-medium italic">Transferring you to the debate room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-4 border-white/30">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
            🤖 Debate with AI
          </h1>
          <p className="text-gray-600 font-semibold italic">Practice your skills against our advanced AI</p>
        </div>

        <div className="space-y-8">
          {/* Difficulty Selection */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 p-2 rounded-lg text-blue-600 text-sm">Step 1</span> Choose Difficulty
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {difficulties.map((d) => (
                <button
                  key={d.level}
                  onClick={() => setDifficulty(d.level)}
                  className={`p-4 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95 border-2 ${
                    difficulty === d.level
                      ? "bg-purple-600 text-white border-purple-400 shadow-lg"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="text-3xl mb-2">{d.emoji}</div>
                  <div className="capitalize">{d.level}</div>
                  <div className="text-[10px] opacity-80 mt-1 font-medium">{d.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Topic Selection */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="bg-blue-100 p-2 rounded-lg text-blue-600 text-sm">Step 2</span> Choose Topic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {suggestedTopics.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTopic(t);
                    setTopicError("");
                  }}
                  className={`p-4 rounded-xl text-left text-sm font-semibold transition-all border-2 ${
                    topic === t
                      ? "bg-blue-600 text-white border-blue-400 shadow-md"
                      : "bg-gray-50 text-gray-700 border-gray-100 hover:border-blue-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative group">
              <p className="text-sm text-gray-500 mb-2 font-bold ml-1 uppercase tracking-wider">Or Enter Your Own:</p>
              <input
                type="text"
                placeholder="Ex: Impact of space exploration..."
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setTopicError("");
                }}
                className={`w-full px-5 py-4 bg-gray-50 border-2 rounded-2xl font-semibold focus:outline-none transition-all ${
                  topicError 
                    ? "border-red-400 focus:border-red-500" 
                    : "border-gray-200 focus:border-blue-500"
                }`}
              />
              {topicError && (
                <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-bold shadow-sm">
                  {topicError}
                </div>
              )}
            </div>
          </section>

          {/* Start Action */}
          <div className="pt-4">
            <button
              onClick={handleStartDebate}
              disabled={loading || topicValidating || !topic.trim()}
              className={`w-full py-5 rounded-2xl font-bold text-xl text-white transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                loading || topicValidating || !topic.trim()
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-b-4 border-black/20"
              }`}
            >
              {topicValidating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                  Analyzing Topic...
                </>
              ) : loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"></div>
                  Initializing...
                </>
              ) : (
                <>
                  <span>Start AI Arena</span>
                  <span className="text-2xl">⚡</span>
                </>
              )}
            </button>
            <p className="text-center text-gray-500 text-xs mt-4 font-semibold italic">
              💪 Improve skills | 🧠 AI feedback | 🏆 Track progress
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
