import { useHead, useSeoMeta } from '@unhead/react';
import { EventMonitor } from './EventMonitor';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Inspect – Inspect, verify and monitor Nostr events',
    description: 'Inspect, verify and monitor Nostr events from any relay.',
  });
  // Restores the home canonical after visiting an event page, which replaces it
  useHead({ link: [{ rel: 'canonical', href: 'https://nostrinspect.com/' }] });

  return <EventMonitor />;
};

export default Index;
