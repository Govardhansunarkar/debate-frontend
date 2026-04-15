import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegStar, FaStar } from "react-icons/fa6";
import { FiAlertTriangle, FiArrowRight, FiAward, FiBarChart2, FiCheckCircle, FiHome, FiInfo, FiRefreshCw, FiTrendingUp, FiZap } from "react-icons/fi";

export default function SimpleFeedback({ feedback, debateMetrics, topic, debateId }) {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("overview");

  if (!feedback) {
    return <div className="text-center py-8">Loading feedback...</div>;
  }

  // Handle error state
  if (feedback?.success === false) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full border border-slate-200">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <FiAlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Could not load feedback</h2>
            <p className="text-slate-600 mb-4">{feedback?.userMessage || feedback?.error || 'An error occurred while loading your feedback'}</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-sm text-slate-600">
              {feedback?.isTimeout ? 'Request timed out' : 'Network error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl transition"
            >
              <FiRefreshCw className="h-4 w-4" />
              Reload page
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl transition border border-slate-200"
            >
              <FiHome className="h-4 w-4" />
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Get overall rating (0-10)
  const overallRating = Math.round(feedback.overall_score || 7);
  const stars = Math.min(5, Math.round(overallRating / 2));

  // Determine performance level
  let performanceLevel = "Good Start";
  let performanceColor = "bg-yellow-50";
  let performanceBorder = "border-yellow-300";

  if (overallRating >= 8) {
    performanceLevel = "Excellent";
    performanceColor = "bg-green-50";
    performanceBorder = "border-green-300";
  } else if (overallRating >= 6) {
    performanceLevel = "Good Job";
    performanceColor = "bg-yellow-50";
    performanceBorder = "border-yellow-300";
  } else if (overallRating >= 4) {
    performanceLevel = "Keep Trying";
    performanceColor = "bg-orange-50";
    performanceBorder = "border-orange-300";
  } else {
    performanceLevel = "Keep Learning";
    performanceColor = "bg-red-50";
    performanceBorder = "border-red-300";
  }

  // Format feedback source
  const isGenuineLLM = feedback?.source === 'NVIDIA_LLM' || feedback?.isGenuineLLM !== false;
  const feedbackSource = feedback?.source || 'UNKNOWN';
  
  let feedbackBadge = 'AI-powered analysis';
  let feedbackBadgeColor = 'bg-green-100 border-green-300 text-green-700';
  
  if (feedbackSource === 'INTELLIGENT_FALLBACK') {
    feedbackBadge = 'Personalized feedback analysis';
    feedbackBadgeColor = 'bg-blue-100 border-blue-300 text-blue-700';
  } else if (feedbackSource === 'NVIDIA_LLM') {
    feedbackBadge = 'AI-powered analysis (LLM)';
    feedbackBadgeColor = 'bg-green-100 border-green-300 text-green-700';
  } else if (feedbackSource === 'FALLBACK_TEMPLATE') {
    feedbackBadge = 'Template feedback (auto-generated)';
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
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-2">
            Your debate performance
          </h1>
          <p className="text-slate-600">
            Here is how you did against the AI opponent.
          </p>
        </div>

        {/* Main Score Card */}
        <div
          className={`${performanceColor} border-4 ${performanceBorder} rounded-2xl p-8 mb-6 shadow-lg`}
        >
          <div className="text-center">
            {/* Stars Rating */}
            <div className="flex justify-center gap-2 mb-4 text-amber-400">
              {[...Array(5)].map((_, i) => (
                i < stars ? <FaStar key={i} className="h-7 w-7" /> : <FaRegStar key={i} className="h-7 w-7 text-slate-300" />
              ))}
            </div>

            {/* Overall Score */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="text-5xl font-semibold text-slate-900">
                {overallRating}
              </div>
              <div className="text-lg text-slate-500">/10</div>
            </div>

            {/* Performance Level */}
            <h2 className="text-2xl font-semibold mb-2 text-slate-900">{performanceLevel}</h2>
            <p className="text-slate-600">
              Topic: <span className="font-semibold">{topic}</span>
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Speeches Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FiZap className="w-5 h-5 text-sky-600" />
              <p className="text-sm text-slate-500">Speeches</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {debateMetrics?.totalSpeeches || 0}
            </p>
          </div>

          {/* Points Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FiAward className="w-5 h-5 text-emerald-600" />
              <p className="text-sm text-slate-500">Total points</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {debateMetrics?.totalPoints || 0}
            </p>
          </div>

          {/* Duration Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FiBarChart2 className="w-5 h-5 text-violet-600" />
              <p className="text-sm text-slate-500">Speaking time</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {debateMetrics?.totalDuration || 0}s
            </p>
          </div>

          {/* Avg Words */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FiTrendingUp className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-slate-500">Avg words</p>
            </div>
            <p className="text-2xl font-semibold text-slate-900">
              {Math.round(debateMetrics?.averageWordCount || 0)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-sm border border-slate-200 overflow-x-auto">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition whitespace-nowrap ${
                selectedTab === "overview"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Detailed feedback
            </button>
            <button
              onClick={() => setSelectedTab("strengths")}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition whitespace-nowrap ${
                selectedTab === "strengths"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              What you did well
            </button>
            <button
              onClick={() => setSelectedTab("improve")}
              className={`flex-1 py-2 px-4 rounded-xl font-medium transition whitespace-nowrap ${
                selectedTab === "improve"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              How to improve
            </button>
          </div>
        </div>

        {/* Content - Detailed Feedback (Paragraphs) */}
        {selectedTab === "overview" && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-slate-200 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FiCheckCircle className="h-5 w-5 text-emerald-600" /> What you did well
              </h3>
              <p className="text-slate-600 leading-relaxed text-base">
                {feedback.strengths_paragraph || (feedback.strengths && feedback.strengths[0]) || "Great participation in the debate!"}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FiInfo className="h-5 w-5 text-amber-600" /> How to improve
              </h3>
              <p className="text-slate-600 leading-relaxed text-base">
                {feedback.improvement_paragraph || (feedback.weaknesses && feedback.weaknesses[0]) || "Focus on adding more examples to support your points."}
              </p>
            </div>

            {feedback.recommendations && feedback.recommendations.length > 0 && (
              <div className="border-t border-slate-200 pt-6 bg-slate-50 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FiArrowRight className="h-4 w-4 text-slate-500" /> Key recommendations
                </h4>
                <ul className="space-y-2">
                  {feedback.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="flex gap-3 text-slate-600">
                      <span className="flex-shrink-0 text-slate-900 font-medium">{idx + 1}.</span>
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
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiCheckCircle className="h-5 w-5 text-emerald-600" /> What you did well
            </h3>

            {feedback.strengths && feedback.strengths.length > 0 ? (
              <ul className="space-y-3">
                {feedback.strengths.slice(0, 4).map((strength, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <FiCheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                    <span className="text-slate-600">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No strengths data available</p>
            )}
          </div>
        )}

        {/* Content - Improvements */}
        {selectedTab === "improve" && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-slate-200">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FiInfo className="h-5 w-5 text-amber-600" /> How to improve
            </h3>

            {feedback.improvements && feedback.improvements.length > 0 ? (
              <ul className="space-y-3">
                {feedback.improvements.slice(0, 4).map((improvement, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
                  >
                    <FiArrowRight className="h-5 w-5 flex-shrink-0 text-slate-500 mt-0.5" />
                    <span className="text-slate-600">{improvement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No improvement suggestions available</p>
            )}
          </div>
        )}

        {/* Quick Tips */}
        <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FiBarChart2 className="h-4 w-4 text-slate-500" /> Quick tips
          </h3>
          <ul className="space-y-2 text-slate-600">
            <li className="flex gap-2">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <span>Use specific examples and numbers in your arguments</span>
            </li>
            <li className="flex gap-2">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <span>Address the AI's counterpoints directly</span>
            </li>
            <li className="flex gap-2">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <span>Speak clearly and at a steady pace</span>
            </li>
            <li className="flex gap-2">
              <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
              <span>Practice debating on different topics</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-800"
          >
            <FiHome className="w-4 h-4" />
            Back to home
          </button>
          <button
            onClick={() => navigate("/ai-debate")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FiRefreshCw className="w-4 h-4" />
            Try another debate
          </button>
        </div>
      </div>
    </div>
  );
}
