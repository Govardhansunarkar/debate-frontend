import { useState } from "react";
import { joinRoom } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!roomCode.trim()) {
      alert("Please enter a room code");
      return;
    }
    
    setLoading(true);
    const res = await joinRoom(
      roomCode,
      localStorage.getItem("userId"),
      localStorage.getItem("playerName")
    );

    if (!res.success) {
      alert(res.error || "Failed to join room");
    } else {
      navigate(`/debate-room/${roomCode}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-3xl font-bold mb-6 text-center">🏠 Join Room</h2>

        <input
          type="text"
          placeholder="Enter room code..."
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl tracking-widest mb-6"
        />
        
        <button
          onClick={handleJoin}
          disabled={loading || !roomCode.trim()}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold mb-4"
        >
          {loading ? "Joining..." : "Join Room"}
        </button>
        
        <p className="text-sm text-gray-600 text-center">
          Ask your friend for the room code to join their debate
        </p>
      </div>
    </div>
  );
}