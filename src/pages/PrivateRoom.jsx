import { useState } from "react";
import { createRoom, joinRoom, validateTopic } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

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
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-3xl font-bold mb-6">🎉 Room Created!</h2>

          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <p className="text-gray-600 mb-3">Share this code with your friend:</p>
            <p className="text-5xl font-bold text-blue-600 tracking-widest font-mono">{roomCode}</p>
          </div>

          <p className="text-gray-700 mb-6">
            <span className="text-sm text-gray-600">Topic: </span>
            <span className="font-semibold text-lg">{createTopic}</span>
          </p>

          <button
            onClick={handleStartDebate}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold mb-3 transition"
          >
            Start Debate 🎬
          </button>

          <button
            onClick={handleResetCreate}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition"
          >
            Create Another Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">🏛️ Private Rooms</h1>
          <p className="text-white/80 text-lg">Create a room or join one with a code</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Create Debate Room */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
                1
              </div>
              <h2 className="text-3xl font-bold">Create Room</h2>
            </div>

            <p className="text-gray-600 mb-6">Set up a new debate room and invite members with a code</p>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Debate Topic</label>
              <input
                type="text"
                placeholder="e.g., Should we have a 4-day work week?"
                value={createTopic}
                onChange={(e) => {
                  setCreateTopic(e.target.value);
                  setTopicError("");  // Clear error when user types
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                  topicError ? "border-red-500 bg-red-50" : "border-gray-300"
                }`}
              />
              {topicError && (
                <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{topicError}</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
              <p className="text-sm text-gray-700">
                💡 <strong>Tip:</strong> Choose an interesting topic with multiple perspectives for you and your members to debate about!
              </p>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={createLoading || topicValidating || !createTopic.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition text-lg"
            >
              {topicValidating ? "✓ Validating topic..." : createLoading ? "Creating..." : "Create Room 🚀"}
            </button>
          </div>

          {/* Section 2: Join Debate Room */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="flex items-center mb-6">
              <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold mr-3">
                2
              </div>
              <h2 className="text-3xl font-bold">Join Room</h2>
            </div>

            <p className="text-gray-600 mb-6">Join an existing debate room using a code from a friend</p>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">Room Code</label>
              <input
                type="text"
                placeholder="Enter room code..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest font-mono font-bold"
              />
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
              <p className="text-sm text-gray-700">
                💡 <strong>Tip:</strong> Ask your friend for the 4-letter room code to join their debate!
              </p>
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={joinLoading || !joinCode.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition text-lg"
            >
              {joinLoading ? "Joining..." : "Join Room 🎯"}
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-bold mb-2">Multiple Members</h3>
            <p className="text-white/80 text-sm">Invite as many friends as you want to debate</p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white text-center">
            <div className="text-4xl mb-3">🎥</div>
            <h3 className="font-bold mb-2">Video & Audio</h3>
            <p className="text-white/80 text-sm">See faces and hear voices of all participants</p>
          </div>
          <div className="bg-white/10 backdrop-blur p-6 rounded-lg text-white text-center">
            <div className="text-4xl mb-3">⏱️</div>
            <h3 className="font-bold mb-2">5 Min Debate</h3>
            <p className="text-white/80 text-sm">Structured debate sessions with automatic timing</p>
          </div>
        </div>
      </div>
    </div>
  );
}
