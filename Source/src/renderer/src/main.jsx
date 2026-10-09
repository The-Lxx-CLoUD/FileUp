import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/theme.css';
import './styles/layout.css';
import './styles/files.css';
import './styles/dialogs.css';

createRoot(document.getElementById('root')).render(<App />);
