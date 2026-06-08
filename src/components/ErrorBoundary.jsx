import React from 'react';

// ── Error boundary ───────────────────────────────────────────────────────────
// React unmounts the entire tree when a render throws and nothing catches it —
// that is the "blank white page" failure mode. This boundary catches those
// throws (e.g. a bad JSON.parse inside a page) and shows a recovery UI plus a
// "Try again" / "Go home" path instead of leaving the user staring at nothing.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Surface to the console (and any future error-reporting hook) for triage.
    console.error('Render error caught by ErrorBoundary:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-md w-full glass-panel p-10 rounded-2xl text-center">
          <h1 className="text-2xl font-light tracking-[0.2em] text-white mb-3 uppercase">
            Something interrupted this page
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            We hit an unexpected error while loading this view. Your account and
            cart are safe — try reloading, or head back to the homepage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-white text-black rounded-lg text-xs tracking-[0.2em] uppercase font-medium hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="px-6 py-3 border border-white/20 text-white rounded-lg text-xs tracking-[0.2em] uppercase font-medium hover:bg-white/5 transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
