import { useSeoMeta } from '@unhead/react';
import { EventMonitor } from './EventMonitor';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Inspect',
    description: 'Inspect, verify and monitor Nostr events from any relay.',
  });

  return <EventMonitor />;
};

export default Index;
