import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';

// Apply stored theme before first render to prevent FOUC (inline scripts are stripped by WXT)
const _t = localStorage.getItem('theme');
if (
  _t === 'dark' ||
  ((!_t || _t === 'system') &&
    window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
