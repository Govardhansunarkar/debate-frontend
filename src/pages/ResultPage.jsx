import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../services/socket";
import FeedbackReport from "../components/FeedbackReport";
import { getDebateFeedback } from "../services/debateAnalysis";

export default function ResultPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const [debate, setDebate] = useState(null);
  const [results, setResults] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [speeches, setSpeeches] = useState([]);
  const [debateMetrics, setDebateMetrics] = useState(null);
  const [topic, setTopic] = useState(""); 
  const [loading, setLoading] = useState(true);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);

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

        console.log('[ResultPage] LocalStorage data:', {
          speeches: savedSpeeches ? JSON.parse(savedSpeeches).length : 0,
          metrics: !!savedMetrics,
          topic: savedTopic
        });

        if (savedSpeeches) {
          const parsedSpeeches = JSON.parse(savedSpeeches);
          setSpeeches(parsedSpeeches);

          // Fetch AI feedback
          console.log('[ResultPage] Fetching AI feedback...');
          setFetchingFeedback(true);
          const feedbackData = await getDebateFeedback(
            debateId,
            savedTopic || "General Debate",
            parsedSpeeches
          );
          console.log('[ResultPage] AI feedback received:', feedbackData);
          setFeedback(feedbackData);
          setFetchingFeedback(false);
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
          Promise.all([
            fetch(`https://ai-debate-arena-backend-9zur.onrender.com/api/debates/${debateId}`)
              .then(res => {
                if (res.ok) return res.json();
                return null;
              })
              .catch(() => null),
            fetch(`https://ai-debate-arena-backend-9zur.onrender.com/api/debates/${debateId}/results`)
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

  const playerScores = results?.scores || {};
  const maxScore = Math.max(...Object.values(playerScores));
  const winner = Object.entries(playerScores).find(
    ([_, score]) => score === maxScore
  )?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Winner Banner */}
        <div className="bg-yellow-400 text-center py-6 rounded-lg mb-6 shadow-lg">
          <h1 className="text-4xl font-bold">🏆 Debate Results</h1>
          <p className="text-2xl mt-2">
            Winner: <span className="font-bold">{winner}</span>
          </p>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(playerScores).map(([player, score]) => (
            <div
              key={player}
              className={`p-6 rounded-lg text-white font-semibold text-center ${
                player === winner ? "bg-green-500" : "bg-blue-500"
              }`}
            >
              <div className="text-xl">{player}</div>
              <div className="text-4xl mt-2">{score.toFixed(1)}</div>
              <div className="text-sm mt-2">points</div>
            </div>
          ))}
        </div>

        {/* AI Feedback Report */}
        <div className="bg-white rounded-lg p-8 mb-6 shadow-lg">
          <h2 className="text-3xl font-bold mb-6">🤖 AI-Powered Feedback</h2>
          {fetchingFeedback ? (
            <div className="text-center py-8">
              <p className="text-gray-600">🔄 Analyzing your debate speech...</p>
            </div>
          ) : feedback ? (
            <FeedbackReport 
              feedback={feedback} 
              playerName={localStorage.getItem("playerName")}
              debateMetrics={debateMetrics}
            />
          ) : (
            <p className="text-gray-600">No feedback available yet.</p>
          )}
        </div>

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