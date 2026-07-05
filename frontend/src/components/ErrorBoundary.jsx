import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-error)' }}>error</span>
          <h3>Something went wrong</h3>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button className="btn btn-primary" onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
