import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { TestApp } from '@/test/TestApp';
import { useEventById, type EventLookup } from '@/hooks/useEventById';
import { EventPage } from './EventPage';

vi.mock('@/hooks/useEventById', () => ({ useEventById: vi.fn() }));

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

function renderAt(path: string, lookup: Partial<EventLookup> = {}) {
  vi.mocked(useEventById).mockReturnValue({ relays: [], isSearching: false, ...lookup });
  window.history.pushState({}, '', path);
  return render(
    <TestApp>
      <Routes>
        <Route path="/e/:ref" element={<EventPage />} />
      </Routes>
    </TestApp>
  );
}

describe('EventPage', () => {
  beforeEach(() => {
    vi.mocked(useEventById).mockReset();
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

  it('explains that naddr links are not supported yet', () => {
    renderAt(`/e/${nip19.naddrEncode({ kind: 38383, pubkey: AUTHOR, identifier: 'order' })}`);

    expect(screen.getByText('Link type not supported yet')).toBeInTheDocument();
    expect(screen.getByText('naddr')).toBeInTheDocument();
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

  it('shows a verified event with its details and JSON', () => {
    renderAt(`/e/${ID}`, {
      event,
      verification: { idValid: true, signatureValid: true, authorMatches: true, kindMatches: true },
      relays: [{ url: 'wss://relay.mostro.network', status: 'found', fromLink: true }],
    });

    expect(screen.getByText('Signature valid')).toBeInTheDocument();
    expect(screen.getByText('Id matches content')).toBeInTheDocument();
    expect(screen.getByText('Author matches link')).toBeInTheDocument();
    expect(screen.getByText('Kind matches link')).toBeInTheDocument();
    expect(screen.getByText(nip19.npubEncode(AUTHOR))).toBeInTheDocument();
    expect(screen.getByText('has it')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy JSON' })).toBeInTheDocument();
  });

  it('flags an event that fails verification', () => {
    renderAt(`/e/${ID}`, {
      event,
      verification: { idValid: true, signatureValid: false },
    });

    expect(screen.getByText('Signature invalid')).toBeInTheDocument();
    expect(screen.queryByText('Author matches link')).not.toBeInTheDocument();
  });
});
