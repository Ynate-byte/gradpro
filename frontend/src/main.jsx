import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          {/* 2. Đặt Toaster ở đây, ngay bên cạnh App */}
          <Toaster richColors position="bottom-right" />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);