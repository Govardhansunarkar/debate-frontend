import React, { useState } from "react";
import { BarChart3, Zap, Award, TrendingUp, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SimpleFeedback({ feedback, debateMetrics, topic, debateId }) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");

  if (!feedback) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  // Get overall rating (0-10)
  const overallRating = Math.round(feedback.overall_score || 7);
  const stars = Math.min(5, Math.round(overallRating / 2));

  // Determine performance level
  let performanceLevel = "🟡 Good Start";
  let performanceColor = "bg-yellow-50";
  let performanceBorder = "border-yellow-300";

  if (overallRating >= 8) {
    performanceLevel = "🟢 Excellent!";
    performanceColor = "bg-green-50";
    performanceBorder = "border-green-300";
  } else if (overallRating >= 6) {
    performanceLevel = "🟡 Good Job!";
    performanceColor = "bg-yellow-50";
    performanceBorder = "border-yellow-300";
  } else if (overallRating >= 4) {
    performanceLevel = "🟠 Keep Trying";
    performanceColor = "bg-orange-50";
    performanceBorder = "border-orange-300";
  } else {
    performanceLevel = "🔴 Keep Learning";
    performanceColor = "bg-red-50";
    performanceBorder = "border-red-300";
  }

  // Format feedback source
  const isGenuineLLM = feedback?.source === 'NVIDIA_LLM' || feedback?.isGenuineLLM !== false;
  const feedbackSource = feedback?.source || 'UNKNOWN';
  
  let feedbackBadge = '✅ AI-Powered Analysis';
  let feedbackBadgeColor = 'bg-green-100 border-green-300 text-green-700';
  
  if (feedbackSource === 'INTELLIGENT_FALLBACK') {
    feedbackBadge = '✅ Personalized Feedback Analysis';
    feedbackBadgeColor = 'bg-blue-100 border-blue-300 text-blue-700';
  } else if (feedbackSource === 'NVIDIA_LLM') {
    feedbackBadge = '✅ AI-Powered Analysis (LLM)';
    feedbackBadgeColor = 'bg-green-100 border-green-300 text-green-700';
  } else if (feedbackSource === 'FALLBACK_TEMPLATE') {
    feedbackBadge = '🔄 Template Feedback (Auto-generated)';
    feedbackBadgeColor = 'bg-orange-100 border-orange-300 text-orange-700';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Feedback Source Badge */}
        <div className="flex justify-center mb-4">
          <div className={`px-4 py-2 rounded-full border-2 font-semibold text-sm ${feedbackBadgeColor}`}>
            {feedbackBadge}
          </div>
        </div>

        {/* Warning if not genuine LLM */}
        {feedback?.warning && feedbackSource !== 'INTELLIGENT_FALLBACK' && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mb-4 text-center">
            <p className="text-orange-800 text-sm">
              <span className="font-semibold">ℹ️ Note:</span> {feedback.warning}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            🎓 Your Debate Performance
          </h1>
          <p className="text-gray-600">
            Here's how you did against the AI opponent
          </p>
        </div>

        {/* Main Score Card */}
        <div
          className={`${performanceColor} border-4 ${performanceBorder} rounded-2xl p-8 mb-6 shadow-lg`}
        >
          <div className="text-center">
            {/* Stars Rating */}
            <div className="flex justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-3xl">
                  {i < stars ? "⭐" : "☆"}
                </span>
              ))}
            </div>

            {/* Overall Score */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="text-5xl font-bold text-indigo-600">
                {overallRating}
              </div>
              <div className="text-lg text-gray-600">/10</div>
            </div>

            {/* Performance Level */}
            <h2 className="text-2xl font-bold mb-2">{performanceLevel}</h2>
            <p className="text-gray-700">
              Topic: <span className="font-semibold">{topic}</span>
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Speeches Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-blue-500">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-gray-600">Speeches</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {debateMetrics?.totalSpeeches || 0}
            </p>
          </div>

          {/* Points Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-green-500" />
              <p className="text-sm text-gray-600">Total Points</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {debateMetrics?.totalPoints || 0}
            </p>
          </div>

          {/* Duration Card */}
          <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-purple-500">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-gray-600">Speaking Time</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {debateMetrics?.totalDuration || 0}s
            </p>
          </div>

          {/* Avg Words */}
          <div className="bg-white rounded-xl p-4 shadow-md border-l-4 border-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <p className="text-sm text-gray-600">Avg Words</p>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {Math.round(debateMetrics?.averageWordCount || 0)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 bg-white rounded-lg p-2 shadow-md">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                selectedTab === "overview"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              📊 Detailed Feedback
            </button>
            <button
              onClick={() => setSelectedTab("strengths")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                selectedTab === "strengths"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              ✅ What You Did Well
            </button>
            <button
              onClick={() => setSelectedTab("improve")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
                selectedTab === "improve"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              💡 How to Improve
            </button>
          </div>
        </div>

        {/* Content - Detailed Feedback (Paragraphs) */}
        {selectedTab === "overview" && (
          <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-l-4 border-blue-500 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                <span className="text-2xl">✅</span> What You Did Well
              </h3>
              <p className="text-gray-700 leading-relaxed text-base">
                {feedback.strengths_paragraph || (feedback.strengths && feedback.strengths[0]) || "Great participation in the debate!"}
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> How to Improve
              </h3>
              <p className="text-gray-700 leading-relaxed text-base">
                {feedback.improvement_paragraph || (feedback.weaknesses && feedback.weaknesses[0]) || "Focus on adding more examples to support your points."}
              </p>
            </div>

            {feedback.recommendations && feedback.recommendations.length > 0 && (
              <div className="border-t pt-6 bg-indigo-50 rounded-lg p-4">
                <h4 className="text-lg font-bold text-indigo-700 mb-3">🎯 Key Recommendations</h4>
                <ul className="space-y-2">
                  {feedback.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-700">
                      <span className="flex-shrink-0 text-indigo-600 font-bold">{idx + 1}.</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Content - Strengths */}
        {selectedTab === "strengths" && (
          <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-l-4 border-green-500">
            <h3 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
              <span className="text-2xl">✅</span> What You Did Well
            </h3>

            {feedback.strengths && feedback.strengths.length > 0 ? (
              <ul className="space-y-3">
                {feedback.strengths.slice(0, 4).map((strength, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="text-2xl flex-shrink-0">👍</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">No strengths data available</p>
            )}
          </div>
        )}

        {/* Content - Improvements */}
        {selectedTab === "improve" && (
          <div className="bg-white rounded-xl p-6 shadow-md mb-6 border-l-4 border-orange-500">
            <h3 className="text-xl font-bold text-orange-700 mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span> How to Improve
            </h3>

            {feedback.improvements && feedback.improvements.length > 0 ? (
              <ul className="space-y-3">
                {feedback.improvements.slice(0, 4).map((improvement, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <span className="text-2xl flex-shrink-0">🚀</span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 italic">No improvement suggestions available</p>
            )}
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-indigo-50 rounded-xl p-6 mb-6 border-2 border-indigo-200">
          <h3 className="text-lg font-bold text-indigo-700 mb-4">🎯 Quick Tips</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-2">
              <span>📌</span>
              <span>Use specific examples and numbers in your arguments</span>
            </li>
            <li className="flex gap-2">
              <span>📌</span>
              <span>Address the AI's counterpoints directly</span>
            </li>
            <li className="flex gap-2">
              <span>📌</span>
              <span>Speak clearly and at a steady pace</span>
            </li>
            <li className="flex gap-2">
              <span>📌</span>
              <span>Practice debating on different topics</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition flex items-center gap-2 shadow-md"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </button>
          <button
            onClick={() => navigate("/ai-debate")}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition shadow-md"
          >
            Try Another Debate 🔄
          </button>
        </div>
      </div>
    </div>
  );
}
