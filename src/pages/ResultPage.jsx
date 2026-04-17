import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import FeedbackReport from "../components/FeedbackReport";
import SimpleFeedback from "../components/SimpleFeedback";
import { getDebateFeedback, simplifyFeedback, generatePerUserFeedback, trackDebateMetrics } from "../services/debateAnalysis";
import { FiAlertTriangle, FiArrowRight, FiAward, FiBarChart2, FiCheckCircle, FiHome, FiMessageSquare, FiRefreshCw, FiTrendingUp, FiUsers } from "react-icons/fi";

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
        const isAIDebateTemp = savedRoomType === 'ai';
        const parsedSpeeches = savedSpeeches ? JSON.parse(savedSpeeches) : [];
        const userOnlySpeeches = parsedSpeeches.filter((speech) => speech?.speaker !== 'ai');
        const analysisSpeeches = isAIDebateTemp ? userOnlySpeeches : parsedSpeeches;

        console.log('[ResultPage] LocalStorage data:', {
          speeches: parsedSpeeches.length,
          metrics: !!savedMetrics,
          topic: savedTopic,
          roomType: savedRoomType
        });

        if (isAIDebateTemp) {
          setIsAIDebate(true);
        }

        if (parsedSpeeches.length > 0) {
          setSpeeches(parsedSpeeches);

          if (analysisSpeeches.length > 0) {
            setDebateMetrics(trackDebateMetrics(analysisSpeeches));
          }

          setFetchingFeedback(true);

          try {
            console.log('[ResultPage] ⏳ Fetching AI analysis...');
            const feedbackData = await getDebateFeedback(
              debateId,
              savedTopic || "General Debate",
              analysisSpeeches
            );

            if (feedbackData?.success) {
              const simplifiedFeedback = simplifyFeedback(feedbackData, analysisSpeeches);
              setFeedback(simplifiedFeedback);
              console.log('[ResultPage] ✅ LLM feedback loaded successfully');
            } else {
              setFeedback(feedbackData);
            }
          } catch (err) {
            console.warn('[ResultPage] LLM analysis failed:', err.message);
            setFeedback({
              success: false,
              error: err.message,
              userMessage: err.message,
              isTimeout: false
            });
          } finally {
            setFetchingFeedback(false);
          }
        } else {
          console.warn('[ResultPage] No speeches found in localStorage!');
        }

        if (savedMetrics) {
          setDebateMetrics(isAIDebateTemp ? trackDebateMetrics(analysisSpeeches) : JSON.parse(savedMetrics));
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white">
            <FiAward className="h-6 w-6" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Debate results</h1>
          <p className="mt-3 text-slate-600">
            Winner: <span className="font-medium text-slate-900">{winner}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(playerScores).map(([player, score]) => (
            <div key={player} className={`rounded-2xl border p-6 shadow-sm ${player === winner ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-sky-100 bg-white/95 text-slate-900"}`}>
              <div className="flex items-center gap-3 text-sm font-medium opacity-80 mb-4">
                <FiAward className="h-4 w-4" />
                {player}
              </div>
              <div className="text-5xl font-semibold">{score.toFixed(1)}</div>
              <div className="mt-2 text-sm opacity-80">points</div>
            </div>
          ))}
        </div>

        {!isAIDebate && Object.keys(perUserFeedback).length > 0 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 inline-flex items-center gap-2">
                <FiBarChart2 className="h-5 w-5 text-slate-500" /> Individual feedback
              </h2>
            </div>

            {Object.values(perUserFeedback).map((userFeedback, idx) => (
              <div key={idx} className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white font-semibold text-lg">
                    {userFeedback.playerName?.[0] || "?"}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{userFeedback.playerName}</h3>
                    <p className="text-slate-600">Score: {userFeedback.analysis.overallScore}/100</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{userFeedback.stats.turns}</p>
                    <p className="text-xs text-slate-500 mt-1">Turns</p>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{userFeedback.stats.totalPoints}</p>
                    <p className="text-xs text-slate-500 mt-1">Points</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{userFeedback.stats.avgWordCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Avg words</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-center">
                    <p className="text-2xl font-semibold text-slate-900">{userFeedback.stats.avgQuality}</p>
                    <p className="text-xs text-slate-500 mt-1">Quality</p>
                  </div>
                </div>

                <div className="space-y-4 text-slate-600">
                  <div>
                    <p className="font-medium text-slate-900 mb-2 inline-flex items-center gap-2"><FiMessageSquare className="h-4 w-4 text-slate-500" /> Summary</p>
                    <p className="italic">{userFeedback.analysis.summary}</p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-900 mb-2 inline-flex items-center gap-2"><FiCheckCircle className="h-4 w-4 text-emerald-600" /> Strengths</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.strengths.map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-slate-900 mb-2 inline-flex items-center gap-2"><FiAlertTriangle className="h-4 w-4 text-amber-600" /> Areas for improvement</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.weaknesses.map((weakness, i) => (
                        <li key={i}>{weakness}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-slate-900 mb-2 inline-flex items-center gap-2"><FiTrendingUp className="h-4 w-4 text-sky-600" /> Next steps</p>
                    <ul className="list-disc list-inside space-y-1">
                      {userFeedback.analysis.improvements.map((improvement, i) => (
                        <li key={i}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(isAIDebate || localStorage.getItem(`roomType_${debateId}`) === 'user-only') && (
          <div className="rounded-2xl border border-violet-100 bg-white/95 p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6 inline-flex items-center gap-2"><FiMessageSquare className="h-5 w-5 text-slate-500" /> AI-powered analysis</h2>
            {fetchingFeedback ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-violet-200 border-t-violet-500 mb-4"></div>
                <p className="font-medium">Generating AI analysis...</p>
                <p className="text-sm text-slate-500 mt-2">This can take a few seconds.</p>
              </div>
            ) : feedback ? (
              <FeedbackReport 
                feedback={feedback} 
                playerName={localStorage.getItem("playerName")}
                debateMetrics={debateMetrics}
              />
            ) : (
              <div className="text-center py-8 text-slate-600">
                <p className="font-medium mb-2 inline-flex items-center gap-2"><FiAlertTriangle className="h-4 w-4 text-amber-600" /> Analysis not loaded</p>
                <p className="text-sm">Check if your backend is running and the API keys are correct.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 py-2 text-white hover:from-violet-600 hover:to-indigo-600 transition"
                >
                  <FiRefreshCw className="h-4 w-4" /> Retry analysis
                </button>
              </div>
            )}
          </div>
        )}

        {debate?.messages && (
          <div className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4 inline-flex items-center gap-2"><FiMessageSquare className="h-4 w-4 text-slate-500" /> Debate messages</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {debate.messages.map((msg, idx) => (
                <div key={idx} className="border-l-2 border-slate-200 pl-4">
                  <p className="font-medium text-slate-900">{msg.player}:</p>
                  <p className="text-slate-600">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3 font-medium text-white transition hover:from-sky-600 hover:to-indigo-600"
          >
            <FiHome className="h-4 w-4" /> New debate
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FiArrowRight className="h-4 w-4 rotate-180" /> Go back
          </button>
        </div>
      </div>
    </div>
  );
}