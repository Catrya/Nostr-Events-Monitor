// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "dark",
  relayUrl: "wss://relay.primal.net",
};

const presetRelays = [
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];

export function App() {
  return (
    <div className="dark">
      <UnheadProvider head={head}>
        <AppProvider storageKey="nostr-inspect:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
          <QueryClientProvider client={queryClient}>
            <NostrLoginProvider storageKey='nostr-inspect:login'>
              <NostrProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <ErrorBoundary>
                    <Suspense>
                      <AppRouter />
                    </Suspense>
                  </ErrorBoundary>
                </TooltipProvider>
              </NostrProvider>
            </NostrLoginProvider>
          </QueryClientProvider>
        </AppProvider>
      </UnheadProvider>
    </div>
  );
}

export default App;
