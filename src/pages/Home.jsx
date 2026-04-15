import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiArrowRight, FiCpu, FiLogOut, FiShuffle, FiShield, FiTarget, FiUsers } from "react-icons/fi";

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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-rose-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-sky-100 bg-white/90 backdrop-blur px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img 
                src={user.picture} 
                alt={user.name} 
                className="h-10 w-10 rounded-full border border-slate-200"
              />
            )}
            <div>
              <p className="text-sm text-slate-500">Welcome back</p>
              <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 hover:bg-rose-100 transition"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        <div className="mx-auto max-w-3xl text-center mb-8 md:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-4 py-2 text-sm text-slate-600 shadow-sm">
            <FiShield className="h-4 w-4 text-sky-500" />
            Structured debate platform
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl mb-4">
            AI Debate Arena
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-slate-600">
            Practice with real opponents or AI, then review feedback in a clean, focused interface.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <button
            onClick={() => handleStart('random')}
            className="rounded-2xl border border-sky-100 bg-white/95 p-6 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <FiShuffle className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Random Match</h2>
                <p className="mt-1 text-sm text-slate-500">Auto-match with available opponents</p>
              </div>
              <FiArrowRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>

          <button
            onClick={() => handleStart('private')}
            className="rounded-2xl border border-emerald-100 bg-white/95 p-6 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FiUsers className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Private Room</h2>
                <p className="mt-1 text-sm text-slate-500">Create a room and invite others</p>
              </div>
              <FiArrowRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>

          <button
            onClick={() => handleStart('ai')}
            className="rounded-2xl border border-violet-100 bg-white/95 p-6 text-left shadow-sm transition hover:border-violet-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FiCpu className="h-5 w-5" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI Debate</h2>
                <p className="mt-1 text-sm text-slate-500">Practice against the AI coach</p>
              </div>
              <FiArrowRight className="h-5 w-5 text-slate-400" />
            </div>
          </button>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-white/95 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <FiTarget className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Clear structure</p>
                <p className="text-sm text-slate-500">Focus on arguments instead of clutter.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FiShield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Professional layout</p>
                <p className="text-sm text-slate-500">Neutral colors and restrained motion.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <FiUsers className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Flexible modes</p>
                <p className="text-sm text-slate-500">Solo practice, private rooms, or random matches.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}