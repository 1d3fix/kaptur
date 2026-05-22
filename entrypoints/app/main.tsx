import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initSearchIndex } from '@/lib/search';
import { ensureStoragePersistent } from '@/lib/storage/persist';
import './style.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center font-mono text-sm">
          <p className="font-semibold">Something went wrong.</p>
          <pre className="max-w-lg overflow-auto rounded border bg-muted p-4 text-xs text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            className="rounded border px-3 py-1.5 text-xs hover:bg-accent"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Apply stored theme before first render to prevent FOUC (inline scripts are stripped by WXT)
const _t = localStorage.getItem('theme');
if (
  _t === 'dark' ||
  ((!_t || _t === 'system') &&
    window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
}

void initSearchIndex().catch((err) => {
  console.error('[Kaptur] search index init failed', err);
});

void ensureStoragePersistent().then((granted) => {
  console.debug('[Kaptur] storage persisted:', granted);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
