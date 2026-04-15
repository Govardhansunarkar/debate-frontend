import React from 'react';
import { FiAlertTriangle, FiHome, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('[ErrorBoundary] Error caught:', error);
    console.error('[ErrorBoundary] Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex items-center justify-center">
          <div className="max-w-md bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <FiAlertTriangle className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 mb-3">Something went wrong</h1>
              <p className="text-slate-600 mb-4">
                An unexpected error occurred in the debate room.
              </p>
              <details className="mb-6 text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
                <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                  Error Details
                </summary>
                <pre className="text-xs text-rose-700 overflow-auto max-h-40">
                  {this.state.error?.message}
                </pre>
              </details>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition"
              >
                <FiHome className="h-4 w-4" />
                Return to Home
              </button>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-medium transition border border-slate-200"
              >
                <FiRefreshCw className="h-4 w-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
