import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PrivateRoom from "./pages/PrivateRoom";
import DebateRoom from "./pages/DebateRoom";
import ResultPage from "./pages/ResultPage";
import RandomMatch from "./pages/RandomMatch";
import AIDebate from "./pages/AIDebate";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/private-room" element={<PrivateRoom />} />
      <Route path="/debate-room/:debateId" element={<DebateRoom />} />
      <Route path="/results/:debateId" element={<ResultPage />} />
      <Route path="/random-match" element={<RandomMatch />} />
      <Route path="/ai-debate" element={<AIDebate />} />
    </Routes>
  );
}