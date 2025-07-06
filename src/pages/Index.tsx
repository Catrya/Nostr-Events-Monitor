import { useSeoMeta } from '@unhead/react';
import { EventMonitor } from './EventMonitor';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Event Monitor',
    description: 'A simple dark-themed web app for monitoring Nostr events.',
  });

  return <EventMonitor />;
};

export default Index;
