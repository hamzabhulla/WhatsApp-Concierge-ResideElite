import { Component } from 'react';

/** Without this, any render error leaves a blank white page. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Dashboard crashed:', error, info && info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-base px-4">
        <div className="card w-full max-w-md p-8 text-center shadow-lift">
          <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted">
            The dashboard hit an unexpected error. Reloading usually fixes it.
          </p>
          <button className="btn-primary mt-6" onClick={() => window.location.reload()}>
            Reload dashboard
          </button>
        </div>
      </div>
    );
  }
}
