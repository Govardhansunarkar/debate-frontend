import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import FeedbackReport from "../components/FeedbackReport";
import SimpleFeedback from "../components/SimpleFeedback";
import { getDebateFeedback, simplifyFeedback, generateQuickFeedback, generatePerUserFeedback } from "../services/debateAnalysis";

export default function ResultPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const [debate, setDebate] = useState(null);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [perUserFeedback, setPerUserFeedback] = useState({});
  const [speeches, setSpeeches] = useState([]);
  const [debateMetrics, setDebateMetrics] = useState(null);
  const [topic, setTopic] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);
  const [isAIDebate, setIsAIDebate] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log('[ResultPage] Loading results for debate:', debateId);
        
        // Check if this is a local debate (timestamp-based ID starting with 'debate_')
        const isLocalDebate = debateId && debateId.startsWith('debate_');
        console.log('[ResultPage] Debate type:', isLocalDebate ? 'LOCAL' : 'BACKEND');
        
        // Fetch from localStorage first (primary source)
        const savedSpeeches = localStorage.getItem(`speeches_${debateId}`);
        const savedMetrics = localStorage.getItem(`debateMetrics_${debateId}`);
        const savedTopic = localStorage.getItem(`topic_${debateId}`);
        const savedRoomType = localStorage.getItem(`roomType_${debateId}`);

        console.log('[ResultPage] LocalStorage data:', {
          speeches: savedSpeeches ? JSON.parse(savedSpeeches).length : 0,
          metrics: !!savedMetrics,
          topic: savedTopic,
          roomType: savedRoomType
        });

        // Check if this is an AI debate
        const isAIDebateTemp = savedRoomType === 'ai';
        const isUserOnlyDebate = savedRoomType === 'user-only';
        
        if (isAIDebateTemp) {
          setIsAIDebate(true);
        }

        if (savedSpeeches) {
          const parsedSpeeches = JSON.parse(savedSpeeches);
          setSpeeches(parsedSpeeches);

          // ⚡ HIGH IMPORTANCE: Show real analysis IMMEDIATELY if we have enough speeches
          if (parsedSpeeches.length > 2) {
            setFetchingFeedback(true);
            (async () => {
              try {
                console.log('[ResultPage] ⏳ Fetching PRIORITY AI analysis...');
                const feedbackData = await getDebateFeedback(
                  debateId,
                  savedTopic || "General Debate",
                  parsedSpeeches
                );
                
                if (feedbackData?.success) {
                  const simplifiedFeedback = simplifyFeedback(feedbackData, parsedSpeeches);
                  setFeedback(simplifiedFeedback);
                } else {
                  // If success is false, use fallback immediately
                  const quickFeedback = generateQuickFeedback(parsedSpeeches);
                  setFeedback(simplifyFeedback(quickFeedback, parsedSpeeches));
                }
              } catch (err) {
                console.error('[ResultPage] Priority AI analysis failed:', err);
                // Fallback to quick feedback only if priority fails
                const quickFeedback = generateQuickFeedback(parsedSpeeches);
                setFeedback(simplifyFeedback(quickFeedback, parsedSpeeches));
              } finally {
                setFetchingFeedback(false);
              }
            })();
          } else {
            // Very short debate - use quick feedback
            const quickFeedback = generateQuickFeedback(parsedSpeeches);
            setFeedback(simplifyFeedback(quickFeedback, parsedSpeeches));
          }
        } else {
          console.warn('[ResultPage] No speeches found in localStorage!');
        }

        if (savedMetrics) {
          setDebateMetrics(JSON.parse(savedMetrics));
        }

        if (savedTopic) {
          setTopic(savedTopic);
        }

        // Only try to fetch from API if this is a BACKEND debate (UUID-based, not local)
        if (!isLocalDebate) {
          console.log('[ResultPage] Fetching from backend API...');
          const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3001/api'
            : 'https://debate-backend-paro.onrender.com/api';
          
          // Non-blocking async fetch
          Promise.all([
            fetch(`${BASE_URL}/debates/${debateId}`)
              .then(res => {
                if (res.ok) return res.json();
                return null;
              })
              .catch(() => null),
            fetch(`${BASE_URL}/debates/${debateId}/results`)
              .then(res => {
                if (res.ok) return res.json();
                return null;
              })
              .catch(() => null)
          ]).then(([debateData, resultsData]) => {
            if (debateData?.debate) {
              setDebate(debateData.debate);
            }
            if (resultsData?.results) {
              setResults(resultsData.results);
            }
          }).catch(() => {
            console.debug('[ResultPage] Backend API not available');
          });
        } else {
          console.log('[ResultPage] Skipping API calls for local debate (using localStorage only)');
        }
      } catch (error) {
        console.error('[ResultPage] Error fetching results:', error);
      }

      setLoading(false);
    };

    if (debateId) {
      fetchResults();
    }
  }, [debateId]);

  if (loading) return <div className="text-center p-8">Loading results...</div>;

  // Show SimpleFeedback for AI Debates
  if (isAIDebate) {
    return (
      <SimpleFeedback 
        feedback={feedback}
        debateMetrics={debateMetrics}
        topic={topic}
        debateId={debateId}
      />
    );
  }

  // Show Complex Feedback for User-vs-User Debates

  const playerScores = results?.scores || {};
  const maxScore = Math.max(...Object.values(playerScores));
  const winner = Object.entries(playerScores).find(
    ([_, score]) => score === maxScore
  )?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="max-w-5xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-center py-8 px-6 rounded-2xl mb-6 shadow-xl border-4 border-yellow-600">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800">🏆 Debate Results</h1>
          <p className="text-2xl md:text-3xl mt-4 text-gray-800">
            Winner: <span className="font-bold text-yellow-700 bg-yellow-100 px-4 py-2 rounded-lg inline-block">{winner}</span>
          </p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.entries(playerScores).map(([player, score]) => (
            <div
              key={player}
              className={`p-8 rounded-2xl text-white font-semibold text-center shadow-xl border-4 transform hover:scale-105 transition ${
                player === winner ? "bg-gradient-to-br from-green-500 to-green-600 border-green-700" : "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700"
              }`}
            >
              <div className="text-2xl md:text-3xl font-bold mb-2">{player === winner ? "🥇" : "🥈"} {player}</div>
              <div className="text-5xl md:text-6xl font-bold mt-3">{score.toFixed(1)}</div>
              <div className="text-base md:text-lg mt-3 opacity-90">points</div>
            </div>
          ))}
        </div>

        {/* Per-User Feedback for User-Only Debates */}
        {!isAIDebate && Object.keys(perUserFeedback).length > 0 && (
          <div className="space-y-6 mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">📊 Individual Feedback</h2>
            
            {Object.values(perUserFeedback).map((userFeedback, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border-4 border-blue-200">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {userFeedback.playerName?.[0] || "?"}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{userFeedback.playerName}</h3>
                    <p className="text-lg font-semibold text-purple-600">Score: {userFeedback.analysis.overallScore}/100</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{userFeedback.stats.turns}</p>
                    <p className="text-xs text-gray-600">Turns</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{userFeedback.stats.totalPoints}</p>
                    <p className="text-xs text-gray-600">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{userFeedback.stats.avgWordCount}</p>
                    <p className="text-xs text-gray-600">Avg Words</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-600">{userFeedback.stats.avgQuality}</p>
                    <p className="text-xs text-gray-600">Quality</p>
                  </div>
                </div>

                {/* Feedback */}
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-gray-700 mb-2">💡 Summary</p>
                    <p className="text-gray-600 italic">{userFeedback.analysis.summary}</p>
                  </div>

                  <div>
                    <p className="font-bold text-green-700 mb-2">✅ Strengths</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.strengths.map((strength, i) => (
                        <li key={i} className="text-green-700">{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-orange-700 mb-2">⚠️ Areas for Improvement</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.weaknesses.map((weakness, i) => (
                        <li key={i} className="text-orange-700">{weakness}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold text-blue-700 mb-2">🎯 Next Steps</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.improvements.map((improvement, i) => (
                        <li key={i} className="text-blue-700">{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Feedback Report (AI and Private Debates) */}
        {(isAIDebate || localStorage.getItem(`roomType_${debateId}`) === 'user-only') && (
          <div className="bg-white rounded-2xl p-8 md:p-10 mb-8 shadow-xl border-4 border-purple-200">
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">🤖 AI-Powered Analysis</h2>
            {fetchingFeedback ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
                <p className="text-xl font-semibold text-purple-700 animate-pulse">🔄 Generating AI-Powered Analysis...</p>
                <p className="text-gray-500 mt-2">NVIDIA Nemotron is analyzing your arguments (takes ~15-30s)</p>
              </div>
            ) : feedback ? (
              <FeedbackReport 
                feedback={feedback} 
                playerName={localStorage.getItem("playerName")}
                debateMetrics={debateMetrics}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-orange-600 font-semibold mb-2">⚠️ Analysis not loaded</p>
                <p className="text-gray-600">Check if your backend is running and NVIDIA API keys are correct.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Retry Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Debate Messages */}
        {debate?.messages && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">💬 Debate Messages</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {debate.messages.map((msg, idx) => (
                <div key={idx} className="border-l-4 border-gray-300 pl-4">
                  <p className="font-semibold text-gray-800">{msg.player}:</p>
                  <p className="text-gray-600">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold"
          >
            New Debate
          </button>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}