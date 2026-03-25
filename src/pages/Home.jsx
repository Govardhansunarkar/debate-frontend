import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleStart = (mode) => {
    if (mode === "random") navigate("/random-match");
    else if (mode === "private") navigate("/private-room");
    else if (mode === "ai") navigate("/ai-debate");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-3xl w-full border-4 border-white/30">
        {/* User Info & Logout */}
        <div className="flex justify-between items-center mb-6 pb-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border-2 border-blue-500"
              />
            )}
            <div>
              <p className="text-sm text-gray-600">Welcome back!</p>
              <p className="text-lg font-bold text-gray-800">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
            🎤 AI Debate Arena
          </h1>
          <p className="text-gray-700 text-base md:text-lg leading-relaxed">
            Master communication & critical thinking through structured debates with real opponents and AI analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <button
            onClick={() => handleStart('random')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-5 px-6 rounded-xl font-semibold transition transform hover:scale-105 active:scale-95 flex flex-col items-center gap-3 shadow-lg border-2 border-blue-700/50"
          >
            <span className="text-4xl">🎲</span>
            <span className="text-lg">Random Match</span>
            <span className="text-xs opacity-80">Auto-matchmaking</span>
          </button>

          <button
            onClick={() => handleStart('private')}
            className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5 px-6 rounded-xl font-semibold transition transform hover:scale-105 active:scale-95 flex flex-col items-center gap-3 shadow-lg border-2 border-green-700/50"
          >
            <span className="text-4xl">🏛️</span>
            <span className="text-lg">Private Room</span>
            <span className="text-xs opacity-80">Invite friends</span>
          </button>

          <button
            onClick={() => handleStart('ai')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-5 px-6 rounded-xl font-semibold transition transform hover:scale-105 active:scale-95 flex flex-col items-center gap-3 shadow-lg border-2 border-purple-700/50"
          >
            <span className="text-4xl">🤖</span>
            <span className="text-lg">AI Debate</span>
            <span className="text-xs opacity-80">Practice mode</span>
          </button>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <p className="text-center text-gray-800 font-semibold text-sm md:text-base">
            💪 Improve your debating skills | 🧠 Get AI-powered feedback | 🏆 Track your progress
          </p>
        </div>
      </div>
    </div>
  );
}