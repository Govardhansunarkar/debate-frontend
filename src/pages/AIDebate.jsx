import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import { validateTopic } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { FiArrowRight, FiCpu, FiLoader, FiSliders, FiTarget } from "react-icons/fi";

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
    { level: "easy", label: "Easy", description: "AI beginner" },
    { level: "medium", label: "Medium", description: "Balanced" },
    { level: "hard", label: "Hard", description: "AI expert" },
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
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-violet-100 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <FiCpu className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">Debate starting</h2>
          <div className="mb-6">
            <p className="text-slate-600 mb-4 font-medium">Your AI opponent is being prepared.</p>
            <div className="inline-flex items-center justify-center rounded-full border border-violet-100 bg-violet-50 p-4">
              <FiLoader className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500">Transferring you to the debate room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-4xl w-full rounded-2xl border border-violet-100 bg-white/95 p-6 md:p-10 shadow-sm">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
            <FiCpu className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
            Debate with AI
          </h1>
          <p className="text-slate-600">Practice your skills against the AI coach.</p>
        </div>

        <div className="space-y-8">
          {/* Difficulty Selection */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-600">1</span>
              <FiSliders className="h-4 w-4 text-slate-500" /> Choose difficulty
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {difficulties.map((d) => (
                <button
                  key={d.level}
                  onClick={() => setDifficulty(d.level)}
                  className={`p-4 rounded-2xl font-medium transition border ${
                    difficulty === d.level
                      ? "bg-violet-500 text-white border-violet-500"
                      : "bg-white text-slate-700 border-violet-100 hover:bg-violet-50"
                  }`}
                >
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-[10px] opacity-80 mt-1">{d.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Topic Selection */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">2</span>
              <FiTarget className="h-4 w-4 text-slate-500" /> Choose topic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {suggestedTopics.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTopic(t);
                    setTopicError("");
                  }}
                  className={`p-4 rounded-xl text-left text-sm font-medium transition border ${
                    topic === t
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-white text-slate-700 border-sky-100 hover:bg-sky-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="relative group">
              <p className="text-xs text-slate-500 mb-2 ml-1 uppercase tracking-wider">Or enter your own</p>
              <input
                type="text"
                placeholder="Ex: Impact of space exploration..."
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setTopicError("");
                }}
                className={`w-full px-5 py-4 bg-white border rounded-2xl font-medium focus:outline-none transition ${
                  topicError 
                    ? "border-red-300 focus:ring-2 focus:ring-red-100" 
                    : "border-sky-100 focus:ring-2 focus:ring-sky-100"
                }`}
              />
              {topicError && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
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
              className={`w-full py-4 rounded-2xl font-medium text-white transition flex items-center justify-center gap-3 ${
                loading || topicValidating || !topic.trim()
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
              }`}
            >
              {topicValidating ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  Analyzing Topic...
                </>
              ) : loading ? (
                <>
                  <FiLoader className="h-5 w-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <span>Start AI debate</span>
                  <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-center text-slate-500 text-xs mt-4">
              Practice, review, and improve in one flow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
