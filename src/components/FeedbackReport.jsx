import { useState } from "react";
import { formatDuration } from "../services/debateAnalysis";
import { FiAlertTriangle, FiArrowRight, FiBarChart2, FiFileText, FiMessageSquare } from "react-icons/fi";

export default function FeedbackReport({ feedback, playerName, debateMetrics }) {
  const [activeTab, setActiveTab] = useState("summary"); // summary, transcript

  if (!feedback) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-slate-200">
        <p className="text-slate-600">Loading feedback...</p>
      </div>
    );
  }

  if (!feedback.success) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
        <p className="text-rose-700 font-semibold flex items-center gap-2"><FiAlertTriangle className="h-4 w-4" /> Error generating feedback</p>
        <p className="text-rose-600 text-sm mt-1">{feedback.error}</p>
      </div>
    );
  }

  // Get analysis from available LLM feedback (prioritize openai, fallback to gemini)
  const analysis = feedback.openai?.analysis || feedback.gemini?.analysis;

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "summary"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="inline-flex items-center gap-2"><FiBarChart2 className="h-4 w-4" /> Analysis</span>
        </button>
        <button
          onClick={() => setActiveTab("transcript")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            activeTab === "transcript"
              ? "border-b-2 border-slate-900 text-slate-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span className="inline-flex items-center gap-2"><FiFileText className="h-4 w-4" /> Transcript</span>
        </button>
      </div>

      {/* Analysis Tab (Main LLM Feedback) */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl text-center border border-slate-200">
              <div className="text-3xl font-semibold text-slate-900">
                {debateMetrics?.totalWords || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Total words</div>
            </div>
            <div className="bg-white p-4 rounded-xl text-center border border-slate-200">
              <div className="text-3xl font-semibold text-slate-900">
                {debateMetrics?.totalSpeeches || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Total speeches</div>
            </div>
            <div className="bg-white p-4 rounded-xl text-center border border-slate-200">
              <div className="text-3xl font-semibold text-slate-900">
                {debateMetrics?.averageWordCount || 0}
              </div>
              <div className="text-sm text-slate-500 mt-1">Avg words/speech</div>
            </div>
            <div className="bg-white p-4 rounded-xl text-center border border-slate-200">
              <div className="text-3xl font-semibold text-slate-900">
                {formatDuration(debateMetrics?.totalDuration || 0)}
              </div>
              <div className="text-sm text-slate-500 mt-1">Total duration</div>
            </div>
          </div>

          {/* Overall Score */}
          {analysis?.overall_score && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-semibold text-slate-900">
                  {analysis.overall_score}/10
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2"><FiMessageSquare className="h-4 w-4 text-slate-500" /> NVIDIA LLM analysis</h3>
                  <p className="text-slate-600 mt-2">{analysis.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis?.strengths && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-2 text-slate-600">
                    <span className="text-slate-900 font-medium">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {analysis?.weaknesses && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Areas for improvement</h3>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex gap-2 text-slate-600">
                    <span className="text-slate-900 font-medium">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis?.recommendations && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-slate-600">
                    <FiArrowRight className="h-4 w-4 mt-0.5 text-slate-500" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Points Made */}
          {analysis?.key_points && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Key points made</h3>
              <ul className="space-y-2">
                {analysis.key_points.map((point, idx) => (
                  <li key={idx} className="flex gap-2 text-slate-600">
                    <FiArrowRight className="h-4 w-4 mt-0.5 text-slate-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!analysis && (
            <div className="text-center text-slate-500 py-8">
              <p>LLM analysis not available yet</p>
            </div>
          )}
        </div>
      )}

      {/* Transcript Tab */}
      {activeTab === "transcript" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl divide-y max-h-96 overflow-y-auto">
            {debateMetrics?.speeches && debateMetrics.speeches.length > 0 ? (
              debateMetrics.speeches.map((speech, idx) => {
                // Determine engine badge info
                const engineColors = {
                  nvidia: { bg: "bg-slate-100", text: "text-slate-700", label: "NVIDIA LLM" },
                  openai: { bg: "bg-slate-100", text: "text-slate-700", label: "OpenAI" },
                  gemini: { bg: "bg-slate-100", text: "text-slate-700", label: "Gemini" },
                  "smart-engine": { bg: "bg-slate-100", text: "text-slate-700", label: "Smart engine" },
                  fallback: { bg: "bg-slate-100", text: "text-slate-700", label: "Fallback" },
                  user: { bg: "bg-slate-100", text: "text-slate-700", label: "User response" },
                  unknown: { bg: "bg-slate-100", text: "text-slate-700", label: "Unknown" },
                };
                
                const engineInfo = engineColors[speech.engine] || engineColors.unknown;
                const isAI = speech.speaker === "ai";
                
                return (
                  <div key={idx} className="p-4 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-semibold text-slate-900">
                        Speech #{idx + 1}
                        <span className={`text-xs ml-2 px-2 py-1 rounded-full ${engineInfo.bg} ${engineInfo.text}`}>
                          {engineInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 space-x-2">
                        <span className="bg-slate-100 px-2 py-1 rounded-full">
                          {speech.wordCount} words
                        </span>
                        <span className="bg-slate-100 px-2 py-1 rounded-full">
                          {formatDuration(speech.duration || 0)}
                        </span>
                        {speech.points && (
                          <span className="bg-slate-100 px-2 py-1 rounded-full">
                            {speech.points.toFixed(0)} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed">{speech.text}</p>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-slate-500">No speeches recorded</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
