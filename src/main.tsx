import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';
import './styles/app.css';
import App from './App';
import { captureAuthRedirect } from './services/authRedirect';

// must run before the hash router reads the URL
captureAuthRedirect();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
