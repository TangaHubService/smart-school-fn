import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { queryClient } from './app/query-client';
import { ToastProvider } from './components/toast';
import { AuthProvider } from './features/auth/auth.context';
import { AppRoutes } from './routes/app-routes';
import './i18n/config';
import './styles/index.css';
import { applyLowBandwidthClass, getLowBandwidthPreferred } from './utils/low-bandwidth-preference';

applyLowBandwidthClass(getLowBandwidthPreferred());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
