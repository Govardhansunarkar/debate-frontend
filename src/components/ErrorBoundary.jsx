import React from 'react';

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6 flex items-center justify-center">
          <div className="max-w-md bg-white rounded-xl shadow-lg p-8 border-2 border-red-500">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ Oops! Something went wrong</h1>
              <p className="text-gray-600 mb-4">
                An unexpected error occurred in the debate room.
              </p>
              <details className="mb-6 text-left bg-gray-50 p-4 rounded border border-gray-200">
                <summary className="cursor-pointer font-semibold text-gray-700 mb-2">
                  Error Details
                </summary>
                <pre className="text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error?.message}
                </pre>
              </details>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition"
              >
                Return to Home
              </button>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition"
              >
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
