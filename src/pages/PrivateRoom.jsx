import { useState } from "react";
import { createRoom, joinRoom, validateTopic } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiArrowRight, FiCheckCircle, FiClock, FiInfo, FiLogIn, FiShield, FiUsers, FiVideo } from "react-icons/fi";

export default function PrivateRoom() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Create Room State
  const [createTopic, setCreateTopic] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [roomCreated, setRoomCreated] = useState(false);
  const [topicError, setTopicError] = useState("");
  const [topicValidating, setTopicValidating] = useState(false);

  // Join Room State
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  // Handle Create Room with Topic Validation
  const handleCreateRoom = async () => {
    if (!createTopic.trim()) {
      setTopicError("Please enter a debate topic");
      return;
    }

    setTopicError("");
    setTopicValidating(true);

    // Validate topic first
    console.log('[PrivateRoom] Validating topic:', createTopic);
    const validation = await validateTopic(createTopic);
    console.log('[PrivateRoom] Validation result:', validation);

    if (!validation.success || !validation.isValid) {
      setTopicError(validation.reason || "❌ This topic is not suitable for debate. Choose a different topic.");
      if (validation.suggestion) {
        setTopicError(prev => prev + "\n\n💡 " + validation.suggestion);
      }
      setTopicValidating(false);
      return;
    }

    setTopicValidating(false);
    setCreateLoading(true);

    const res = await createRoom(
      createTopic,
      user?.name || "Anonymous",
      'user-only'  // Private rooms are for users to debate with each other
    );

    if (!res.success) {
      setTopicError(res.error || "Failed to create room");
      setCreateLoading(false);
      return;
    }

    setRoomCode(res.room.code);
    setRoomCreated(true);
    setCreateLoading(false);
  };

  // Handle Join Room
  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      alert("Please enter a room code");
      return;
    }

    setJoinLoading(true);
    const res = await joinRoom(
      joinCode,
      user?.id,
      user?.name
    );

    if (!res.success) {
      alert(res.error || "Failed to join room");
      setJoinLoading(false);
      return;
    }

    navigate(`/debate-room/${joinCode}`);
    setJoinLoading(false);
  };

  // Start Debate
  const handleStartDebate = () => {
    navigate(`/debate-room/${roomCode}`);
  };

  // Reset Create Room
  const handleResetCreate = () => {
    setRoomCreated(false);
    setRoomCode("");
    setCreateTopic("");
  };

  // Show room created success screen
  if (roomCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white/95 p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <FiCheckCircle className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-5">Room created</h2>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-6 mb-6">
            <p className="text-slate-500 mb-3">Share this code with your friend</p>
            <p className="text-4xl font-semibold tracking-[0.35em] text-slate-900 font-mono">{roomCode}</p>
          </div>

          <p className="text-slate-600 mb-6">
            <span className="text-sm text-slate-500">Topic: </span>
            <span className="font-medium text-slate-900">{createTopic}</span>
          </p>

          <button
            onClick={handleStartDebate}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-medium text-white transition hover:from-emerald-600 hover:to-teal-600 mb-3"
          >
            <FiArrowRight className="h-4 w-4" /> Start debate
          </button>

          <button
            onClick={handleResetCreate}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Create Another Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <FiShield className="h-5 w-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-2">Private rooms</h1>
          <p className="text-slate-600 text-lg">Create a room or join one with a code.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/95 rounded-2xl border border-sky-100 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-sky-500 to-indigo-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold mr-3">
                1
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Create room</h2>
            </div>

            <p className="text-slate-600 mb-6">Set up a new room and invite members with a code.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Debate topic</label>
              <input
                type="text"
                placeholder="e.g., Should we have a 4-day work week?"
                value={createTopic}
                onChange={(e) => {
                  setCreateTopic(e.target.value);
                  setTopicError("");
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                className={`w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 transition ${
                  topicError ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
                }`}
              />
              {topicError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{topicError}</p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 mb-6">
              <p className="text-sm text-slate-600 flex items-start gap-2">
                <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span><strong className="text-slate-800">Tip:</strong> Choose a topic with multiple perspectives so the debate stays productive.</span>
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={createLoading || topicValidating || !createTopic.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3 font-medium text-white transition hover:from-sky-600 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-400"
            >
              {topicValidating ? "Validating topic..." : createLoading ? "Creating..." : "Create room"}
            </button>
          </div>

          <div className="bg-white/95 rounded-2xl border border-emerald-100 p-8 shadow-sm">
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-semibold mr-3">
                2
              </div>
              <h2 className="text-2xl font-semibold text-slate-900">Join room</h2>
            </div>

            <p className="text-slate-600 mb-6">Join an existing room using a code from a friend.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Room code</label>
              <input
                type="text"
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="w-full rounded-xl border border-slate-200 px-4 py-4 text-center text-2xl tracking-widest font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 mb-6">
              <p className="text-sm text-slate-600 flex items-start gap-2">
                <FiInfo className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span><strong className="text-slate-800">Tip:</strong> Ask your friend for the room code before joining.</span>
              </p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={joinLoading || !joinCode.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 font-medium text-white transition hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-400 disabled:to-slate-400"
            >
              <FiLogIn className="h-4 w-4" /> {joinLoading ? "Joining..." : "Join room"}
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <FiUsers className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Multiple members</h3>
            <p className="text-slate-500 text-sm">Invite as many friends as you want to debate.</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white/95 p-6 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <FiVideo className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Video and audio</h3>
            <p className="text-slate-500 text-sm">See and hear every participant clearly.</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-white/95 p-6 shadow-sm text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <FiClock className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Timed sessions</h3>
            <p className="text-slate-500 text-sm">Structured debates with automatic timing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
