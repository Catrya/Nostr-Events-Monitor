import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { TestApp } from '@/test/TestApp';
import { useEventById, type EventLookup } from '@/hooks/useEventById';
import { useAddressableEvent } from '@/hooks/useAddressableEvent';
import { EventPage } from './EventPage';

vi.mock('@/hooks/useEventById', () => ({ useEventById: vi.fn() }));
vi.mock('@/hooks/useAddressableEvent', () => ({ useAddressableEvent: vi.fn() }));

const ID = '7287ca0d61a697ebe107ade2085ad4f41640f8b844bd79f455a743e8ceb0c1f2';
const AUTHOR = '00000235a3e904cfe1213a8a54d6f1ec1bef7cc6bfaabd6193e82931ccf1366a';

const event: NostrEvent = {
  id: ID,
  pubkey: AUTHOR,
  created_at: 1700000000,
  kind: 38383,
  tags: [['s', 'success']],
  content: '',
  sig: 'a'.repeat(128),
};

const empty: EventLookup = { relays: [], isSearching: false };

/** `lookup` is what the hook of the page's mode returns: useEventById on /e/, useAddressableEvent on /a/. */
function renderAt(path: string, lookup: Partial<EventLookup> = {}) {
  const result = { ...empty, ...lookup };
  vi.mocked(useEventById).mockImplementation(ref => (ref ? result : empty));
  vi.mocked(useAddressableEvent).mockImplementation(ref => (ref ? result : empty));
  window.history.pushState({}, '', path);
  return render(
    <TestApp>
      <Routes>
        <Route path="/e/:ref" element={<EventPage />} />
        <Route path="/a/:ref" element={<EventPage mode="address" />} />
      </Routes>
    </TestApp>
  );
}

describe('EventPage', () => {
  beforeEach(() => {
    vi.mocked(useEventById).mockReset();
    vi.mocked(useAddressableEvent).mockReset();
  });

  it('keeps event pages out of search results, with their own canonical URL', async () => {
    const note = nip19.noteEncode(ID);
    renderAt(`/e/${note}`);

    await waitFor(() => expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex'));
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`https://nostrinspect.com/e/${note}`);
  });

  it('passes the parsed reference to the lookup', () => {
    renderAt(`/e/${nip19.neventEncode({ id: ID, relays: ['wss://nos.lol'], author: AUTHOR, kind: 38383 })}`);

    expect(useEventById).toHaveBeenLastCalledWith({ id: ID, relays: ['wss://nos.lol'], author: AUTHOR, kind: 38383 });
  });

  it('shows an error for an invalid link without searching', () => {
    renderAt('/e/not-an-event');

    expect(screen.getByText('Invalid event link')).toBeInTheDocument();
    expect(useEventById).toHaveBeenLastCalledWith(null);
  });

  it('explains that other NIP-19 links are not supported', () => {
    renderAt(`/e/${nip19.npubEncode(AUTHOR)}`);

    expect(screen.getByText('Link type not supported')).toBeInTheDocument();
    expect(screen.getByText('npub')).toBeInTheDocument();
  });

  it('shows the relays while searching', () => {
    renderAt(`/e/${ID}`, {
      isSearching: true,
      relays: [
        { url: 'wss://nos.lol', status: 'missing', fromLink: true },
        { url: 'wss://relay.damus.io', status: 'pending', fromLink: false },
      ],
    });

    expect(screen.getByText('Searching 2 relays…')).toBeInTheDocument();
    expect(screen.getByText('wss://relay.damus.io')).toBeInTheDocument();
    expect(screen.getByText('from link')).toBeInTheDocument();
  });

  it('reports when no relay has the event', () => {
    renderAt(`/e/${ID}`, { relays: [{ url: 'wss://nos.lol', status: 'missing', fromLink: true }] });

    expect(screen.getByText('Event not found')).toBeInTheDocument();
    expect(screen.getByText('not found')).toBeInTheDocument();
  });

  const found = {
    event,
    verification: { idValid: true, signatureValid: true, authorMatches: true, kindMatches: true },
    relays: [
      { url: 'wss://relay.mostro.network', status: 'found', fromLink: true },
      { url: 'wss://nos.lol', status: 'found', fromLink: true },
      { url: 'wss://relay.damus.io', status: 'missing', fromLink: false },
    ],
  } satisfies Partial<EventLookup>;

  it('shows the summaries of a verified event with the sections collapsed', () => {
    renderAt(`/e/${ID}`, found);

    expect(screen.getByText('Verified · 4 of 4 checks passed')).toBeInTheDocument();
    expect(screen.getByText('Kind 38383 · NIP-69 Peer-to-peer Order events')).toBeInTheDocument();
    expect(screen.getByText('Found on 2 relays · 3 checked')).toBeInTheDocument();
    expect(screen.queryByText('Signature valid')).not.toBeInTheDocument();
    expect(screen.queryByText(nip19.npubEncode(AUTHOR))).not.toBeInTheDocument();
    expect(screen.queryByText('has it')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy JSON' })).toBeInTheDocument();
  });

  it('expands each section on click, independently', () => {
    renderAt(`/e/${ID}`, found);

    fireEvent.click(screen.getByText('Verified · 4 of 4 checks passed'));
    expect(screen.getByText('Signature valid')).toBeInTheDocument();
    expect(screen.getByText('Id matches content')).toBeInTheDocument();
    expect(screen.getByText('Author matches link')).toBeInTheDocument();
    expect(screen.getByText('Kind matches link')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Kind 38383 · NIP-69 Peer-to-peer Order events'));
    expect(screen.getByText(nip19.npubEncode(AUTHOR))).toBeInTheDocument();

    fireEvent.click(screen.getByText('Found on 2 relays · 3 checked'));
    expect(screen.getAllByText('has it')).toHaveLength(2);
    expect(screen.getByText('Signature valid')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Verified · 4 of 4 checks passed'));
    expect(screen.queryByText('Signature valid')).not.toBeInTheDocument();
  });

  it('counts only the checks the link allows', () => {
    renderAt(`/e/${ID}`, { ...found, verification: { idValid: true, signatureValid: true } });

    expect(screen.getByText('Verified · 2 of 2 checks passed')).toBeInTheDocument();
  });

  it('opens the verification on its own when a check fails', () => {
    renderAt(`/e/${ID}`, { ...found, verification: { idValid: true, signatureValid: false } });

    expect(screen.getByText('Verification failed · 1 of 2 checks passed')).toBeInTheDocument();
    expect(screen.getByText('Signature invalid')).toBeInTheDocument();
    expect(screen.queryByText('Author matches link')).not.toBeInTheDocument();
  });

  it('keeps counting relays while some are still searching', () => {
    renderAt(`/e/${ID}`, {
      ...found,
      isSearching: true,
      relays: [
        { url: 'wss://nos.lol', status: 'found', fromLink: true },
        { url: 'wss://relay.damus.io', status: 'pending', fromLink: false },
      ],
    });

    expect(screen.getByText('Found on 1 relay · checking 2…')).toBeInTheDocument();
  });

  describe('address mode', () => {
    const D = 'a3ff4901-e1aa-4ea6-bb60-bd8f3c3fbff7';
    const naddr = nip19.naddrEncode({ kind: 38383, pubkey: AUTHOR, identifier: D, relays: ['wss://relay.mostro.network'] });
    const latest: NostrEvent = { ...event, tags: [['d', D], ['s', 'success']] };

    it('looks up the address and not an id', () => {
      renderAt(`/a/${naddr}`);

      expect(useAddressableEvent).toHaveBeenLastCalledWith({ kind: 38383, author: AUTHOR, identifier: D, relays: ['wss://relay.mostro.network'] });
      expect(useEventById).toHaveBeenLastCalledWith(null);
      expect(screen.getByText(/Latest version of an addressable event/)).toBeInTheDocument();
    });

    it('redirects a naddr under /e/ to /a/', () => {
      renderAt(`/e/${naddr}`);

      expect(window.location.pathname).toBe(`/a/${naddr}`);
      expect(useAddressableEvent).toHaveBeenLastCalledWith(expect.objectContaining({ identifier: D }));
    });

    it('redirects an event link under /a/ to /e/', () => {
      const note = nip19.noteEncode(ID);
      renderAt(`/a/${note}`);

      expect(window.location.pathname).toBe(`/e/${note}`);
      expect(useEventById).toHaveBeenLastCalledWith({ id: ID, relays: [] });
    });

    it('shows an error for an invalid address link', () => {
      renderAt('/a/not-an-address');

      expect(screen.getByText('Invalid address link')).toBeInTheDocument();
    });

    it('verifies the d tag and shows the address', () => {
      renderAt(`/a/${naddr}`, {
        event: latest,
        verification: { idValid: true, signatureValid: true, authorMatches: true, kindMatches: true, identifierMatches: true },
        relays: [
          { url: 'wss://relay.mostro.network', status: 'found', fromLink: true },
          { url: 'wss://nos.lol', status: 'outdated', fromLink: false },
        ],
      });

      fireEvent.click(screen.getByText('Verified · 5 of 5 checks passed'));
      expect(screen.getByText('d tag matches link')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Kind 38383 · NIP-69 Peer-to-peer Order events'));
      expect(screen.getByText(`38383:${AUTHOR}:${D}`)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Found on 1 relay · 1 outdated · 2 checked'));
      expect(screen.getByText('older version')).toBeInTheDocument();
    });

    it('reports when no relay has any version', () => {
      renderAt(`/a/${naddr}`, { relays: [{ url: 'wss://nos.lol', status: 'missing', fromLink: false }] });

      expect(screen.getByText(/returned any version of this event/)).toBeInTheDocument();
    });
  });

  describe('newer version on /e/', () => {
    const D = 'a3ff4901-e1aa-4ea6-bb60-bd8f3c3fbff7';
    const old: NostrEvent = { ...event, created_at: 1700000000, tags: [['d', D], ['s', 'pending']] };
    const latest: NostrEvent = { ...event, id: 'b'.repeat(64), created_at: 1700000600, tags: [['d', D], ['s', 'success']] };
    const valid = { idValid: true, signatureValid: true };
    const relays = [{ url: 'wss://relay.mostro.network', status: 'found' as const, fromLink: true }];
    const nevent = nip19.neventEncode({ id: ID, relays: ['wss://relay.mostro.network'] });

    function renderWith(found: NostrEvent, foundValid: boolean, latestEvent?: NostrEvent) {
      vi.mocked(useEventById).mockImplementation(ref => (ref
        ? { event: found, verification: { idValid: true, signatureValid: foundValid }, relays, isSearching: false }
        : empty));
      vi.mocked(useAddressableEvent).mockImplementation(ref => (ref && latestEvent
        ? { event: latestEvent, verification: valid, relays, isSearching: false }
        : empty));
      window.history.pushState({}, '', `/e/${nevent}`);
      return render(
        <TestApp>
          <Routes>
            <Route path="/e/:ref" element={<EventPage />} />
          </Routes>
        </TestApp>
      );
    }

    it('looks up the latest version of a valid addressable event', () => {
      renderWith(old, true);

      expect(useAddressableEvent).toHaveBeenLastCalledWith({ kind: 38383, author: AUTHOR, identifier: D, relays: ['wss://relay.mostro.network'] });
    });

    it('links to the newer version when there is one', () => {
      renderWith(old, true, latest);

      expect(screen.getByText(/A newer version of this event exists/)).toBeInTheDocument();
      const link = screen.getByRole('link', { name: 'View latest →' });
      expect(link.getAttribute('href')).toMatch(/^\/a\/naddr1/);
      expect(nip19.decode(link.getAttribute('href')!.slice(3))).toMatchObject({ type: 'naddr', data: { kind: 38383, pubkey: AUTHOR, identifier: D } });
    });

    it('shows no notice when the event is already the latest', () => {
      renderWith(old, true, old);

      expect(screen.queryByText(/A newer version of this event exists/)).not.toBeInTheDocument();
    });

    it('does not look for versions of a non-addressable event', () => {
      renderWith({ ...event, kind: 1, tags: [] }, true);

      expect(useAddressableEvent).toHaveBeenLastCalledWith(null);
    });

    it('does not look for versions of an event with an invalid signature', () => {
      renderWith(old, false, latest);

      expect(useAddressableEvent).toHaveBeenLastCalledWith(null);
      expect(screen.queryByText(/A newer version of this event exists/)).not.toBeInTheDocument();
    });

    it('explains why an addressable event may be gone', () => {
      renderAt(`/e/${nip19.neventEncode({ id: ID, kind: 38383 })}`);
      expect(screen.getByText(/gets replaced by newer versions/)).toBeInTheDocument();
    });

    it('does not show that explanation for other kinds', () => {
      renderAt(`/e/${nip19.neventEncode({ id: ID, kind: 1 })}`);
      expect(screen.getByText('Event not found')).toBeInTheDocument();
      expect(screen.queryByText(/gets replaced by newer versions/)).not.toBeInTheDocument();
    });
  });
});
