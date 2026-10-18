import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FlowSnap UI Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'monospace', backgroundColor: '#09090b', color: '#f43f5e', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>⚠️ FlowSnap Studio UI Error</h2>
          <pre style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '6px', color: '#e4e4e7', overflowX: 'auto', marginTop: '12px' }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            Reload Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
