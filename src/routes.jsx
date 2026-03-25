import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PrivateRoom from "./pages/PrivateRoom";
import DebateRoom from "./pages/DebateRoom";
import ResultPage from "./pages/ResultPage";
import RandomMatch from "./pages/RandomMatch";
import AIDebate from "./pages/AIDebate";
import ErrorBoundary from "./components/ErrorBoundary";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      <Route path="/private-room" element={
        <ProtectedRoute>
          <PrivateRoom />
        </ProtectedRoute>
      } />
      <Route path="/debate-room/:debateId" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <DebateRoom />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/results/:debateId" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <ResultPage />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/random-match" element={
        <ProtectedRoute>
          <RandomMatch />
        </ProtectedRoute>
      } />
      <Route path="/ai-debate" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <AIDebate />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
    </Routes>
  );
}