import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { nip19 } from 'nostr-tools';
import type { NostrEvent } from '@nostrify/nostrify';
import { CopyEventButton, ShareEventButton } from './EventCardActions';

const AUTHOR = '00000235a3e904cfe1213a8a54d6f1ec1bef7cc6bfaabd6193e82931ccf1366a';
const RELAYS = ['wss://relay.mostro.network', 'wss://nos.lol'];

function ev(kind: number, tags: string[][] = []): NostrEvent {
  return { id: 'a'.repeat(64), pubkey: AUTHOR, created_at: 1700000000, kind, tags, content: '', sig: 'b'.repeat(128) };
}

const writeText = vi.fn<(text: string) => Promise<void>>();

/** The entity of the last copied link, decoded. */
function copied() {
  const url = new URL(writeText.mock.lastCall![0]);
  expect(url.origin).toBe(window.location.origin);
  return { prefix: url.pathname.slice(0, 3), ...nip19.decode(url.pathname.slice(3)) };
}

describe('ShareEventButton', () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });

  it('copies the link to a regular event directly', async () => {
    render(<ShareEventButton event={ev(1)} relays={RELAYS} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link to event' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(copied()).toEqual({ prefix: '/e/', type: 'nevent', data: { id: 'a'.repeat(64), author: AUTHOR, kind: 1, relays: RELAYS } });
    expect(screen.queryByText('Link to this version')).not.toBeInTheDocument();
  });

  it('offers this version or the latest one for addressable events', async () => {
    const order = ev(38383, [['d', 'order-1']]);
    render(<ShareEventButton event={order} relays={RELAYS} />);
    const button = screen.getByRole('button', { name: 'Copy link to event' });

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(await screen.findByText('Link to this version'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(copied()).toMatchObject({ prefix: '/e/', type: 'nevent', data: { id: 'a'.repeat(64), kind: 38383 } });

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(await screen.findByText('Link to latest version'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));
    expect(copied()).toEqual({ prefix: '/a/', type: 'naddr', data: { kind: 38383, pubkey: AUTHOR, identifier: 'order-1', relays: RELAYS } });
  });

  it('shows the copied state only on the button that was used', async () => {
    render(
      <>
        <ShareEventButton event={ev(1)} relays={[]} />
        <ShareEventButton event={ev(1)} relays={[]} />
      </>
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Copy link to event' });

    fireEvent.click(first);

    await waitFor(() => expect(first.querySelector('.text-green-500')).not.toBeNull());
    expect(second.querySelector('.text-green-500')).toBeNull();
  });
});

describe('CopyEventButton', () => {
  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });

  it('copies the event JSON', async () => {
    const event = ev(1);
    render(<CopyEventButton event={event} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy event to clipboard' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(JSON.stringify(event, null, 2)));
  });

  it('shows the copied state only on the card that was copied', async () => {
    render(
      <>
        <CopyEventButton event={ev(1)} />
        <CopyEventButton event={ev(1)} />
      </>
    );
    const [first, second] = screen.getAllByRole('button', { name: 'Copy event to clipboard' });

    fireEvent.click(first);

    await waitFor(() => expect(first.querySelector('.text-green-500')).not.toBeNull());
    expect(second.querySelector('.text-green-500')).toBeNull();
  });
});
