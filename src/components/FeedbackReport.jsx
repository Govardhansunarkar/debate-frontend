import { useState } from "react";
import { formatDuration } from "../services/debateAnalysis";

export default function FeedbackReport({ feedback, playerName, debateMetrics }) {
  const [activeTab, setActiveTab] = useState("summary"); // summary, transcript

  if (!feedback) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <p className="text-gray-600">Loading feedback...</p>
      </div>
    );
  }

  if (!feedback.success) {
    return (
      <div className="bg-red-50 border border-red-300 rounded-lg p-6">
        <p className="text-red-700 font-semibold">❌ Error generating feedback</p>
        <p className="text-red-600 text-sm">{feedback.error}</p>
      </div>
    );
  }

  // Get analysis from available LLM feedback (prioritize openai, fallback to gemini)
  const analysis = feedback.openai?.analysis || feedback.gemini?.analysis;

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b-2 border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-semibold whitespace-nowrap ${
            activeTab === "summary"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📊 Analysis
        </button>
        <button
          onClick={() => setActiveTab("transcript")}
          className={`px-4 py-2 font-semibold whitespace-nowrap ${
            activeTab === "transcript"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          📝 Transcript
        </button>
      </div>

      {/* Analysis Tab (Main LLM Feedback) */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">
                {debateMetrics?.totalWords || 0}
              </div>
              <div className="text-sm text-gray-700 mt-1">Total Words</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">
                {debateMetrics?.totalSpeeches || 0}
              </div>
              <div className="text-sm text-gray-700 mt-1">Total Speeches</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">
                {debateMetrics?.averageWordCount || 0}
              </div>
              <div className="text-sm text-gray-700 mt-1">Avg Words/Speech</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-orange-600">
                {formatDuration(debateMetrics?.totalDuration || 0)}
              </div>
              <div className="text-sm text-gray-700 mt-1">Total Duration</div>
            </div>
          </div>

          {/* Overall Score */}
          {analysis?.overall_score && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-green-600">
                  {analysis.overall_score}/10
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800">🚀 NVIDIA LLM Analysis</h3>
                  <p className="text-gray-600 mt-2">{analysis.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis?.strengths && (
            <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-green-700 mb-3">✅ Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-700">
                    <span className="text-green-600 font-bold">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis?.weaknesses && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-orange-700 mb-3">⚠️ Areas for Improvement</h3>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-700">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis?.recommendations && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-blue-700 mb-3">💡 Recommendations</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-700">
                    <span className="text-blue-600 font-bold">💡</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Points Made */}
          {analysis?.key_points && (
            <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-purple-700 mb-3">🎯 Key Points Made</h3>
              <ul className="space-y-2">
                {analysis.key_points.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-gray-700">
                    <span className="text-purple-600 font-bold">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!analysis && (
            <div className="text-center text-gray-500 py-8">
              <p>💭 LLM Analysis not available yet</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript Tab */}
      {activeTab === "transcript" && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg divide-y max-h-96 overflow-y-auto">
            {debateMetrics?.speeches && debateMetrics.speeches.length > 0 ? (
              debateMetrics.speeches.map((speech, idx) => {
                // Determine engine badge info
                const engineColors = {
                  nvidia: { bg: "bg-green-100", text: "text-green-800", label: "🚀 NVIDIA LLM" },
                  openai: { bg: "bg-blue-100", text: "text-blue-800", label: "🤖 OpenAI" },
                  gemini: { bg: "bg-purple-100", text: "text-purple-800", label: "💎 Gemini" },
                  "smart-engine": { bg: "bg-orange-100", text: "text-orange-800", label: "⚡ Smart Engine" },
                  fallback: { bg: "bg-gray-100", text: "text-gray-800", label: "📝 Fallback" },
                  user: { bg: "bg-indigo-100", text: "text-indigo-800", label: "👤 User Response" },
                  unknown: { bg: "bg-gray-100", text: "text-gray-800", label: "❓ Unknown" },
                };
                
                const engineInfo = engineColors[speech.engine] || engineColors.unknown;
                const isAI = speech.speaker === "ai";
                
                return (
                  <div key={idx} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-semibold text-gray-800">
                        Speech #{idx + 1}
                        <span className={`text-xs ml-2 px-2 py-1 rounded ${engineInfo.bg} ${engineInfo.text}`}>
                          {isAI ? engineInfo.label : engineInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-x-2">
                        <span className="bg-gray-200 px-2 py-1 rounded">
                          {speech.wordCount} words
                        </span>
                        <span className="bg-blue-200 px-2 py-1 rounded">
                          {formatDuration(speech.duration || 0)}
                        </span>
                        {speech.points && (
                          <span className="bg-green-200 px-2 py-1 rounded">
                            {speech.points.toFixed(0)} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{speech.text}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-500">No speeches recorded</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
