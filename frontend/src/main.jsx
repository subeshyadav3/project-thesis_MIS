import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/material-symbols-outlined/full.css';
import App from './App.jsx';

// Apply the saved theme preference before first paint so there's no flash.
// Default = modern; set "tpms-theme" to "legacy" to use the previous theme.
try {
  const saved = localStorage.getItem('tpms-theme');
  document.body.classList.toggle('theme-modern', saved !== 'legacy');
} catch (_) { /* ignore */ }

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
