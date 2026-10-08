import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { NostrFilter } from '@nostrify/nostrify';
import { TestApp } from '@/test/TestApp';
import { TOUR_STORAGE_KEY } from '@/components/GuidedTour';
import { EventMonitor } from './EventMonitor';

// Each test uses its own relay: a search scheduled by a previous test can land after it ends
const queries = vi.hoisted(() => [] as { url: string; filters: NostrFilter[] }[]);

// Relays answer with no events; the tests only look at what was asked
vi.mock('@nostrify/nostrify', async importOriginal => ({
  ...(await importOriginal<typeof import('@nostrify/nostrify')>()),
  NRelay1: class {
    constructor(private url: string) {}
    async query(filters: NostrFilter[]) {
      queries.push({ url: this.url, filters });
      return [];
    }
    async *req() {}
    close() {}
  },
}));

/** The form's submit button (the mode selector has buttons with the same names). */
const submitButton = (name: string) =>
  screen.getAllByRole('button', { name }).find(b => b.getAttribute('type') === 'submit')!;

function renderAt(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <TestApp>
      <EventMonitor />
    </TestApp>
  );
}

describe('EventMonitor shared search', () => {
  beforeEach(() => {
    queries.length = 0;
    localStorage.removeItem(TOUR_STORAGE_KEY);
  });

  it('fills the form from the URL and runs the search', async () => {
    renderAt('/?relays=relay.mostro.network&kinds=38383&tag=s:pending&tag=f:CUP&limit=20');

    expect(screen.getByDisplayValue('wss://relay.mostro.network')).toBeInTheDocument();
    expect(screen.getByDisplayValue('38383')).toBeInTheDocument();
    expect(screen.getByDisplayValue('s:pending')).toBeInTheDocument();
    expect(screen.getByDisplayValue('f:CUP')).toBeInTheDocument();

    await waitFor(() => expect(queries.some(q => q.url === 'wss://relay.mostro.network')).toBe(true));
    expect(queries.find(q => q.url === 'wss://relay.mostro.network')).toEqual({
      url: 'wss://relay.mostro.network',
      filters: [{ kinds: [38383], '#s': ['pending'], '#f': ['CUP'], limit: 20 }],
    });
  });

  it('does not show the walkthrough to someone opening a shared search', () => {
    renderAt('/?relays=nos.lol&kinds=1');

    expect(screen.queryByText('Start with a relay')).not.toBeInTheDocument();
  });

  it('still shows the walkthrough on a first visit without a shared search', () => {
    renderAt('/');

    expect(screen.getByText('Start with a relay')).toBeInTheDocument();
  });

  it('fills a shared stream but waits for the visitor to start it', async () => {
    renderAt('/?relays=relay.damus.io&kinds=1&mode=stream');

    expect(screen.getByDisplayValue('wss://relay.damus.io')).toBeInTheDocument();
    expect(submitButton('Stream')).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 50));
    expect(queries.filter(q => q.url === 'wss://relay.damus.io')).toHaveLength(0);
  });

  it('opens a shared NIP search in NIP mode', async () => {
    renderAt('/?relays=nip.example.com&nips=69');

    expect(screen.getByDisplayValue('69')).toBeInTheDocument();
    await waitFor(() => expect(queries.filter(q => q.url === 'wss://nip.example.com')).toHaveLength(1));
    expect(queries.find(q => q.url === 'wss://nip.example.com')!.filters[0].kinds).toEqual([38383]);
  });

  it('keeps the address bar on the last search', async () => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/');

    fireEvent.change(screen.getByPlaceholderText('relay.damus.io'), { target: { value: 'nos.lol' } });
    fireEvent.change(screen.getByPlaceholderText('leave empty for all kinds'), { target: { value: '7' } });
    fireEvent.click(submitButton('Search'));

    await waitFor(() => expect(window.location.search).toBe('?relays=nos.lol&kinds=7'));
  });

  it('clears the filters from the address bar but keeps the relays', async () => {
    renderAt('/?relays=clear.example.com&kinds=1&tag=t:nostr');
    await waitFor(() => expect(queries.some(q => q.url === 'wss://clear.example.com')).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));

    await waitFor(() => expect(window.location.search).toBe('?relays=clear.example.com'));
  });

  it('copies a link to the search in the form, before running it', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/');

    fireEvent.change(screen.getByPlaceholderText('relay.damus.io'), { target: { value: 'relay.mostro.network' } });
    fireEvent.change(screen.getByPlaceholderText('leave empty for all kinds'), { target: { value: '38383' } });
    fireEvent.click(screen.getByRole('button', { name: 'Share search' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/?relays=relay.mostro.network&kinds=38383`));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('describes a kind without a NIP by its description only', () => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/?relays=kindinfo.example.com&kinds=25050&mode=stream');

    expect(screen.getByRole('link', { name: 'Call Offer' })).toBeInTheDocument();
  });

  it('marks the kind of an unrecommended NIP', () => {
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    renderAt('/?relays=unrec.example.com&kinds=4&mode=stream');

    expect(screen.getByText('unrecommended')).toHaveAttribute('title', 'NIP-04 is unrecommended: deprecated in favor of NIP-17');
  });

  it('warns when searching an unrecommended NIP', async () => {
    renderAt('/?relays=nipwarn.example.com&nips=4');

    expect(await screen.findByText('NIP-04 is unrecommended: deprecated in favor of NIP-17.')).toBeInTheDocument();
  });

  it('opens the full tour from How it works, showing the quickstart even with a relay set', async () => {
    renderAt('/?relays=tour.example.com&kinds=1&mode=stream');
    expect(screen.queryByText('Start with a relay')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /How it works/ }));
    expect(screen.getByText('Start with a relay')).toBeInTheDocument();
    expect(screen.queryByText('// popular relays')).not.toBeInTheDocument();

    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Not sure what to look for?')).toBeInTheDocument();
    expect(await screen.findByText('// popular relays')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
    expect(screen.queryByText('Not sure what to look for?')).not.toBeInTheDocument();
    expect(screen.queryByText('// popular relays')).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_STORAGE_KEY)).toBe('1');
  });
});
