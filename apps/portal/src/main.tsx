import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, RenderBoundary } from '@cvs-garage/ui';
import '@cvs-garage/ui/styles.css';
import './styles.css';
import { App } from './App';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 5 * 60_000, refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: false } } });
createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><ThemeProvider><RenderBoundary><App /></RenderBoundary></ThemeProvider></BrowserRouter></QueryClientProvider></StrictMode>,
);
