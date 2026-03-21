import { useEffect, useState } from "react";
import { createRoom } from "../services/api";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCreate() {
      const data = await createRoom();
      setRoomCode(data.room_code);
    }
    handleCreate();
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Room Created</h2>
      <h3>{roomCode}</h3>

      <button onClick={() => navigate(`/room/${roomCode}`)}>
        Enter Room
      </button>
    </div>
  );
}