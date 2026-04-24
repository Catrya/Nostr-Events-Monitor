import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent, NRelay1, NostrFilter, NostrRelayEVENT } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClickTooltip } from '@/components/ClickTooltip';
import { JsonViewer } from '@/components/JsonViewer';
import { Walkthrough, WALK_STORAGE_KEY } from '@/components/Walkthrough';
import { Copy, Check, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { getKindInfo, getKindsForNip, getNipInfo } from '@/data/kindInfo';
import { SUGGESTED_RELAYS, PRESETS, QueryPreset } from '@/data/presets';

interface EventFilters {
  relays: string[];
  kinds: string[];
  limit: string;
  authors: string[];
  since: string;
  until: string;
  tags: string[];
}

interface EventWithRelay extends NostrEvent {
  relayUrls: string[];
}

type QueryType = 'kind' | 'nip';

const MAX_STREAM_EVENTS = 500;

function deduplicateEvents(events: { event: NostrEvent; relayUrl: string }[]): EventWithRelay[] {
  const map = new Map<string, EventWithRelay>();
  for (const { event, relayUrl } of events) {
    const existing = map.get(event.id);
    if (existing) {
      if (!existing.relayUrls.includes(relayUrl)) {
        existing.relayUrls.push(relayUrl);
      }
    } else {
      map.set(event.id, { ...event, relayUrls: [relayUrl] });
    }
  }
  return Array.from(map.values());
}

function decodeAuthor(author: string): string {
  if (!author) return '';
  if (author.startsWith('npub')) {
    try {
      const decoded = nip19.decode(author);
      if (decoded.type === 'npub') {
        return decoded.data;
      }
    } catch {
      return author;
    }
  }
  return author;
}

function normalizeRelayUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes('://')) return trimmed;
  return `wss://${trimmed}`;
}

function isValidWebSocketUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  try {
    const normalizedUrl = normalizeRelayUrl(url);
    const urlObj = new URL(normalizedUrl);
    return (urlObj.protocol === 'wss:' || urlObj.protocol === 'ws:') && urlObj.hostname !== '';
  } catch {
    return false;
  }
}

export function EventMonitor() {
  const [filters, setFilters] = useState<EventFilters>({
    relays: [''],
    kinds: [''],
    limit: '',
    authors: [''],
    since: '',
    until: '',
    tags: ['']
  });
  const [mode, setMode] = useState<'search' | 'stream'>('search');
  const [queryType, setQueryType] = useState<QueryType>('kind');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamPhase, setStreamPhase] = useState<'connecting' | 'historical' | 'live'>('connecting');
  const [streamEvents, setStreamEvents] = useState<EventWithRelay[]>([]);
  const [lastDisplayedEvents, setLastDisplayedEvents] = useState<EventWithRelay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noRelayHint, setNoRelayHint] = useState<'search' | 'stream' | null>(null);
  const [nipFilter, setNipFilter] = useState<string[]>(['']);
  const [nipKinds, setNipKinds] = useState<number[]>([]);
  const [nipMessage, setNipMessage] = useState<string | null>(null);
  const [kindsExpanded, setKindsExpanded] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);
  const [eventRate, setEventRate] = useState(0);
  const nipActiveRef = useRef(false);
  const relayRef = useRef<NRelay1[]>([]);
  const previousFiltersRef = useRef<NostrFilter>({});
  const previousRelaysRef = useRef<string[]>(filters.relays);
  const rateWindowRef = useRef<number[]>([]);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  // Walkthrough on first visit
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(WALK_STORAGE_KEY)) {
      setWalkOpen(true);
    }
  }, []);

  const closeWalkthrough = useCallback(() => {
    setWalkOpen(false);
    try {
      localStorage.setItem(WALK_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  // Sync queryType with nipActiveRef — if user flips to kind, reset NIP state
  useEffect(() => {
    if (queryType === 'kind' && nipActiveRef.current) {
      nipActiveRef.current = false;
      setNipKinds([]);
      setNipMessage(null);
    }
  }, [queryType]);

  const queryFilters = useMemo(() => {
    const qf: NostrFilter = {};

    if (nipActiveRef.current && nipKinds.length > 0) {
      qf.kinds = nipKinds;
    } else {
      const validKinds = filters.kinds.filter(k => k.trim() !== '').map(k => parseInt(k));
      if (validKinds.length > 0) {
        qf.kinds = validKinds;
      }
    }

    const validAuthors = filters.authors
      .filter(a => a.trim() !== '')
      .map(a => decodeAuthor(a));
    if (validAuthors.length > 0) {
      qf.authors = validAuthors;
    }

    if (filters.since) qf.since = parseInt(filters.since);
    if (filters.until) qf.until = parseInt(filters.until);

    const validTags = filters.tags.filter(t => t.trim() !== '');
    for (const tag of validTags) {
      const [tagName, tagValue] = tag.split(':').map(s => s.trim());
      if (tagName && tagValue) {
        const filterKey = `#${tagName}` as keyof NostrFilter;
        const existing = qf[filterKey] as string[] | undefined;
        qf[filterKey] = (existing ? [...existing, tagValue] : [tagValue]) as never;
      }
    }

    if (filters.limit) qf.limit = parseInt(filters.limit, 10);

    return qf;
  }, [filters.kinds, filters.authors, filters.since, filters.until, filters.tags, filters.limit, nipKinds]);

  const validRelays = useMemo(() => {
    return filters.relays
      .filter(r => r.trim() !== '' && isValidWebSocketUrl(r))
      .map(r => normalizeRelayUrl(r));
  }, [filters.relays]);

  useEffect(() => {
    if (validRelays.length > 0 && nipMessage === 'Enter a relay first') {
      setNipMessage(null);
    }
  }, [validRelays.length, nipMessage]);

  useEffect(() => {
    if (validRelays.length > 0) setNoRelayHint(null);
  }, [validRelays.length]);

  const { isLoading, refetch } = useQuery({
    queryKey: ['events', validRelays, filters.kinds, filters.limit, filters.authors, filters.since, filters.until, filters.tags, nipKinds],
    queryFn: async (c) => {
      if (validRelays.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const qf: NostrFilter = {};

      if (nipActiveRef.current && nipKinds.length > 0) {
        qf.kinds = nipKinds;
      } else {
        const validKinds = filters.kinds.filter(k => k.trim() !== '').map(k => parseInt(k));
        if (validKinds.length > 0) qf.kinds = validKinds;
      }

      const validAuthors = filters.authors
        .filter(a => a.trim() !== '')
        .map(a => decodeAuthor(a));
      if (validAuthors.length > 0) qf.authors = validAuthors;

      if (filters.since) qf.since = parseInt(filters.since);
      if (filters.until) qf.until = parseInt(filters.until);

      const validTags = filters.tags.filter(t => t.trim() !== '');
      for (const tag of validTags) {
        const [tagName, tagValue] = tag.split(':').map(s => s.trim());
        if (tagName && tagValue) {
          const filterKey = `#${tagName}` as keyof NostrFilter;
          const existing = qf[filterKey] as string[] | undefined;
          qf[filterKey] = (existing ? [...existing, tagValue] : [tagValue]) as never;
        }
      }

      qf.limit = filters.limit ? parseInt(filters.limit) : 50;

      const relayPromises = validRelays.map(async (relayUrl) => {
        const relay = new NRelay1(relayUrl);
        try {
          const events = await relay.query([qf], { signal });
          return events.map(event => ({ event, relayUrl }));
        } catch (error) {
          console.error(`Query failed for ${relayUrl}:`, error);
          return [];
        } finally {
          relay.close();
        }
      });

      try {
        const allResults = await Promise.all(relayPromises);
        const allTagged = allResults.flat();
        const allEvents = deduplicateEvents(allTagged);

        const sortedEvents = allEvents.sort((a, b) => b.created_at - a.created_at);
        setLastDisplayedEvents(sortedEvents);

        if (nipActiveRef.current && allEvents.length > 0) {
          const foundKinds = [...new Set(allEvents.map(e => e.kind))].sort((a, b) => a - b);
          const foundKindsStr = foundKinds.map(String);
          setFilters(prev => {
            const current = prev.kinds.filter(k => k.trim() !== '').sort();
            if (current.length === foundKindsStr.length && current.every((v, i) => v === foundKindsStr[i])) {
              return prev;
            }
            return { ...prev, kinds: foundKindsStr };
          });
        }

        return sortedEvents;
      } catch (error) {
        console.error('Query failed:', error);
        throw new Error(`Failed to connect to relays: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    enabled: false,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Streaming
  useEffect(() => {
    if (!isStreaming || validRelays.length === 0) return;

    const currentFiltersString = JSON.stringify(queryFilters);
    const previousFiltersString = JSON.stringify(previousFiltersRef.current);
    const relaysChanged = JSON.stringify(validRelays) !== JSON.stringify(previousRelaysRef.current);

    if (currentFiltersString !== previousFiltersString || relaysChanged) {
      setStreamEvents([]);
      setLastDisplayedEvents([]);
      previousFiltersRef.current = { ...queryFilters };
      previousRelaysRef.current = [...validRelays];
    }

    const relays = validRelays.map(url => new NRelay1(url));
    relayRef.current = relays;

    const controller = new AbortController();
    setStreamPhase('connecting');
    setError(null);

    const eventsMap = new Map<string, EventWithRelay>();
    const maxEvents = filters.limit ? parseInt(filters.limit, 10) : MAX_STREAM_EVENTS;
    const streamFilters: NostrFilter = { ...queryFilters, limit: maxEvents };

    const eoseReceived = new Set<string>();
    let allEoseReceived = false;
    let nipKindsPopulated = false;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flushNow = () => {
      const sorted = Array.from(eventsMap.values()).sort((a, b) => b.created_at - a.created_at);
      const capped = sorted.slice(0, maxEvents);
      if (eventsMap.size > maxEvents) {
        eventsMap.clear();
        for (const event of capped) eventsMap.set(event.id, event);
      }
      setStreamEvents(capped);
      setLastDisplayedEvents(capped);

      if (!nipKindsPopulated && nipActiveRef.current && capped.length > 0) {
        nipKindsPopulated = true;
        const foundKinds = [...new Set(capped.map(e => e.kind))].sort((a, b) => a - b);
        const foundKindsStr = foundKinds.map(String);
        setFilters(prev => {
          const current = prev.kinds.filter(k => k.trim() !== '').sort();
          if (current.length === foundKindsStr.length && current.every((v, i) => v === foundKindsStr[i])) {
            return prev;
          }
          return { ...prev, kinds: foundKindsStr };
        });
      }
    };

    const flushEvents = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => {
        flushTimer = null;
        flushNow();
      }, 150);
    };

    const addEvent = (event: NostrEvent, relayUrl: string) => {
      const existing = eventsMap.get(event.id);
      if (existing) {
        if (!existing.relayUrls.includes(relayUrl)) existing.relayUrls.push(relayUrl);
      } else {
        eventsMap.set(event.id, { ...event, relayUrls: [relayUrl] });
      }
      // Track rate (only after live phase)
      if (allEoseReceived) {
        rateWindowRef.current.push(Date.now());
      }
    };

    const relayLoops = validRelays.map(async (relayUrl, index) => {
      const relay = relays[index];
      try {
        const sub = relay.req([streamFilters], { signal: controller.signal });
        for await (const msg of sub) {
          if (controller.signal.aborted) break;

          if (msg[0] === 'EVENT') {
            const event = (msg as NostrRelayEVENT)[2];
            addEvent(event, relayUrl);
            if (allEoseReceived) flushEvents();
          } else if (msg[0] === 'EOSE') {
            eoseReceived.add(relayUrl);
            if (eoseReceived.size >= validRelays.length) {
              allEoseReceived = true;
              setStreamPhase('live');
              if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
              flushEvents();
            } else {
              setStreamPhase('historical');
            }
          } else if (msg[0] === 'CLOSED') {
            if (!eoseReceived.has(relayUrl)) {
              eoseReceived.add(relayUrl);
              if (eoseReceived.size >= validRelays.length) {
                allEoseReceived = true;
                setStreamPhase('live');
                if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
              }
              flushEvents();
            }
            break;
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(`Streaming error from ${relayUrl}:`, error);
          if (!eoseReceived.has(relayUrl)) {
            eoseReceived.add(relayUrl);
            if (eoseReceived.size >= validRelays.length) {
              allEoseReceived = true;
              setStreamPhase('live');
              if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
            }
            flushEvents();
          }
        }
      }
    });

    Promise.all(relayLoops).then(() => {
      if (!controller.signal.aborted && eventsMap.size === 0) {
        setError('All relay connections closed without receiving events.');
      }
    });

    return () => {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      if (eventsMap.size > 0) flushNow();
      controller.abort();
      relays.forEach(relay => relay.close());
      relayRef.current = [];
    };
  }, [isStreaming, validRelays, queryFilters, filters.limit]);

  // Rolling rate calculation (events/sec over last 1s window)
  useEffect(() => {
    if (!isStreaming || streamPhase !== 'live') {
      setEventRate(0);
      rateWindowRef.current = [];
      return;
    }
    const id = setInterval(() => {
      const cutoff = Date.now() - 1000;
      rateWindowRef.current = rateWindowRef.current.filter(t => t > cutoff);
      setEventRate(rateWindowRef.current.length);
    }, 500);
    return () => clearInterval(id);
  }, [isStreaming, streamPhase]);

  const resolveNipKinds = useCallback((): number[] | null => {
    const validNips = nipFilter.filter(n => n.trim() !== '');
    if (validNips.length === 0) {
      setNipMessage('Enter at least one NIP');
      return null;
    }

    const notFound: string[] = [];
    const noKinds: string[] = [];
    const allKinds: number[] = [];

    for (const n of validNips) {
      const nipInfo = getNipInfo(n.trim());
      if (!nipInfo) {
        notFound.push(n.trim());
        continue;
      }
      const kinds = getKindsForNip(n.trim());
      if (kinds.length === 0) {
        noKinds.push(n.trim());
      }
      for (const k of kinds) {
        if (!allKinds.includes(k)) allKinds.push(k);
      }
    }
    allKinds.sort((a, b) => a - b);

    if (notFound.length > 0) {
      nipActiveRef.current = false;
      setNipKinds([]);
      setNipMessage(`NIP-${notFound.join(', NIP-')} not found`);
      return null;
    }

    if (allKinds.length === 0) {
      nipActiveRef.current = false;
      setNipKinds([]);
      const nipNames = noKinds.map(n => {
        const info = getNipInfo(n);
        return info ? `NIP-${n} (${info.name})` : `NIP-${n}`;
      });
      setNipMessage(`${nipNames.join(', ')} — no associated event kinds`);
      return null;
    }

    if (noKinds.length > 0) {
      setNipMessage(`NIP-${noKinds.join(', NIP-')} — no associated event kinds. Searching remaining NIPs.`);
    } else {
      setNipMessage(null);
    }

    nipActiveRef.current = true;
    setNipKinds(allKinds);
    setFilters(prev => ({ ...prev, kinds: [''] }));
    setKindsExpanded(false);
    return allKinds;
  }, [nipFilter]);

  const handleSearch = useCallback(() => {
    if (validRelays.length === 0) {
      setNoRelayHint('search');
      return;
    }
    setNoRelayHint(null);
    setIsStreaming(false);
    setError(null);

    if (queryType === 'nip') {
      const resolved = resolveNipKinds();
      if (!resolved) return;
    }

    setTimeout(() => refetch(), 0);
  }, [validRelays.length, refetch, queryType, resolveNipKinds]);

  const handleStream = useCallback(() => {
    if (validRelays.length === 0) {
      setNoRelayHint('stream');
      return;
    }
    setNoRelayHint(null);
    setError(null);

    if (queryType === 'nip') {
      const resolved = resolveNipKinds();
      if (!resolved) return;
    }

    setIsStreaming(false);
    setTimeout(() => setIsStreaming(true), 0);
  }, [validRelays.length, queryType, resolveNipKinds]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'search') handleSearch();
    else handleStream();
  }, [mode, handleSearch, handleStream]);

  const displayEvents = useMemo(() => {
    if (isStreaming) {
      if (streamEvents.length === 0 && lastDisplayedEvents.length > 0) {
        return lastDisplayedEvents;
      }
      return streamEvents;
    }
    return lastDisplayedEvents;
  }, [isStreaming, streamEvents, lastDisplayedEvents]);

  const activeFilters = useMemo(() => {
    return [
      (filters.kinds.some(k => k.trim() !== '') || nipActiveRef.current) && 'kind',
      filters.authors.some(a => a.trim() !== '') && 'author',
      filters.since && 'since',
      filters.until && 'until',
      filters.tags.some(t => t.trim() !== '') && 'tags',
      queryType === 'nip' && nipFilter.some(n => n.trim() !== '') && 'nip'
    ].filter(Boolean).length;
  }, [filters.kinds, filters.authors, filters.since, filters.until, filters.tags, nipFilter, queryType]);

  const relayStats = useMemo(() => {
    const stats = new Map<string, number>();
    displayEvents.forEach(event => {
      for (const url of event.relayUrls) {
        const count = stats.get(url) || 0;
        stats.set(url, count + 1);
      }
    });
    return stats;
  }, [displayEvents]);

  const clearFilters = useCallback(() => {
    setIsStreaming(false);
    setFilters(prev => ({
      relays: prev.relays,
      kinds: [''],
      limit: '',
      authors: [''],
      since: '',
      until: '',
      tags: ['']
    }));
    nipActiveRef.current = false;
    setNipFilter(['']);
    setNipKinds([]);
    setNipMessage(null);
    setKindsExpanded(false);
  }, []);

  const addSuggestedRelay = useCallback((host: string) => {
    const url = `wss://${host}`;
    setFilters(prev => {
      if (prev.relays.some(r => r.trim() === url || r.trim() === host)) return prev;
      const next = [...prev.relays];
      const firstEmpty = next.findIndex(r => r.trim() === '');
      if (firstEmpty >= 0) {
        next[firstEmpty] = url;
      } else {
        next.push(url);
      }
      return { ...prev, relays: next };
    });
  }, []);

  const applyPreset = useCallback((p: QueryPreset) => {
    setQueryType('kind');
    nipActiveRef.current = false;
    setNipFilter(['']);
    setNipKinds([]);
    setNipMessage(null);
    setFilters(prev => ({ ...prev, kinds: [p.kind] }));
    setKindsExpanded(false);
  }, []);

  const showEmptyState =
    displayEvents.length === 0 && !isLoading && !isStreaming && !error;

  const streamingLabelSuffix = isStreaming
    ? `(${displayEvents.length}${displayEvents.length >= (filters.limit ? parseInt(filters.limit, 10) : MAX_STREAM_EVENTS) ? ' -- cap reached' : ''})`
    : `(${displayEvents.length})`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {walkOpen && <Walkthrough onClose={closeWalkthrough} />}

      {/* TOPBAR */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="topbar-right">
            <span className="status-pill">
              <span className={`led ${validRelays.length > 0 ? 'on' : 'off'}`} />
              {validRelays.length} relay{validRelays.length !== 1 ? 's' : ''} connected
            </span>
            {isStreaming && (
              <span className="status-pill">
                <span className="led violet" />
                streaming{streamPhase === 'live' ? ` · ${eventRate}/s` : streamPhase === 'connecting' ? ' · connecting' : ' · loading'}
              </span>
            )}
            <span
              className="status-pill clickable"
              onClick={() => setWalkOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setWalkOpen(true)}
            >
              <span>?</span> How it works
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Card className="panel-corner border-accent/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Mode + Query-by segmented controls */}
              <div className="flex flex-wrap items-center gap-4 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Mode</span>
                  <div className="seg" role="tablist" aria-label="Query mode">
                    <button
                      type="button"
                      className={mode === 'search' ? 'on' : ''}
                      onClick={() => setMode('search')}
                    >
                      <span className="seg-icon">◎</span>
                      Search
                      <span className="seg-desc">fetch once</span>
                    </button>
                    <button
                      type="button"
                      className={mode === 'stream' ? 'on' : ''}
                      onClick={() => setMode('stream')}
                    >
                      <span className="seg-icon">⬢</span>
                      Stream
                      <span className="seg-desc">real-time</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-mono">Query by</span>
                  <div className="seg" role="tablist" aria-label="Query type">
                    <button
                      type="button"
                      className={queryType === 'kind' ? 'on' : ''}
                      onClick={() => setQueryType('kind')}
                    >
                      Kind
                    </button>
                    <button
                      type="button"
                      className={queryType === 'nip' ? 'on' : ''}
                      onClick={() => setQueryType('nip')}
                    >
                      NIP
                    </button>
                  </div>
                </div>

                <div className="ml-auto text-[11px] font-mono text-muted-foreground">
                  {queryType === 'nip' ? 'resolves NIPs → kinds' : 'direct event kind numbers'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Relays */}
                <div className="space-y-1">
                  <ClickTooltip
                    content="Nostr relay URLs. You can enter 'relay.damus.io' or 'wss://relay.damus.io' - both formats are accepted."
                    showOnLabelClick={true}
                  >
                    <Label className="text-xs font-medium">
                      Relay <span className="text-accent/70 text-[10px]">(required)</span>
                    </Label>
                  </ClickTooltip>
                  <div className="space-y-1">
                    {filters.relays.map((relay, index) => (
                      <div key={index} className="flex gap-1">
                        <Input
                          type="text"
                          placeholder="relay.damus.io or wss://relay.damus.io"
                          value={relay}
                          onChange={(e) => {
                            const newRelays = [...filters.relays];
                            newRelays[index] = e.target.value;
                            setFilters(prev => ({ ...prev, relays: newRelays }));
                          }}
                          className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${relay ? 'border-accent/50 bg-accent/5' : ''}`}
                        />
                        {index === 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFilters(prev => ({ ...prev, relays: [...prev.relays, ''] }))}
                            className="h-8 w-8 p-0 border-accent/30 bg-transparent hover:bg-accent/10"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newRelays = filters.relays.filter((_, i) => i !== index);
                              setFilters(prev => ({ ...prev, relays: newRelays }));
                            }}
                            className="h-8 w-8 p-0 border-destructive/30 bg-transparent hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kind OR NIP (depending on queryType) */}
                {queryType === 'kind' ? (
                  <div className="space-y-1">
                    <ClickTooltip
                      content="A list of kind numbers, each representing a type of Nostr event."
                      showOnLabelClick={true}
                    >
                      <Label className="text-xs font-medium">Kind</Label>
                    </ClickTooltip>
                    <div className="space-y-1">
                      {(kindsExpanded ? filters.kinds : filters.kinds.slice(0, 3)).map((kind, index) => (
                        <div key={index} className="flex gap-1">
                          <Input
                            type="number"
                            min="0"
                            placeholder="leave empty for all kinds"
                            value={kind}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                                const newKinds = [...filters.kinds];
                                newKinds[index] = value;
                                setFilters(prev => ({ ...prev, kinds: newKinds }));
                                if (nipActiveRef.current) {
                                  nipActiveRef.current = false;
                                  setNipKinds([]);
                                  setNipMessage(null);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                                e.preventDefault();
                              }
                            }}
                            className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${kind ? 'border-accent/50 bg-accent/5' : ''}`}
                          />
                          {index === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFilters(prev => ({ ...prev, kinds: [...prev.kinds, ''] }));
                                if (nipActiveRef.current) {
                                  nipActiveRef.current = false;
                                  setNipKinds([]);
                                  setNipMessage(null);
                                }
                              }}
                              className="h-8 w-8 p-0 border-accent/30 bg-transparent hover:bg-accent/10"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newKinds = filters.kinds.filter((_, i) => i !== index);
                                setFilters(prev => ({ ...prev, kinds: newKinds }));
                                if (nipActiveRef.current) {
                                  nipActiveRef.current = false;
                                  setNipKinds([]);
                                  setNipMessage(null);
                                }
                              }}
                              className="h-8 w-8 p-0 border-destructive/30 bg-transparent hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {filters.kinds.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setKindsExpanded(prev => !prev)}
                          className="flex items-center gap-1 text-xs text-accent hover:underline"
                        >
                          {kindsExpanded ? (
                            <><ChevronUp className="h-3 w-3" />Show less</>
                          ) : (
                            <><ChevronDown className="h-3 w-3" />Show {filters.kinds.length - 3} more kinds</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <ClickTooltip
                      content="NIP number (e.g. 69 or 5A). We resolve the associated kinds automatically."
                      showOnLabelClick={true}
                    >
                      <Label className="text-xs font-medium">NIP</Label>
                    </ClickTooltip>
                    <div className="space-y-1">
                      {nipFilter.map((nip, index) => (
                        <div key={index} className="flex gap-1">
                          <Input
                            type="text"
                            placeholder="e.g. 69 or 5A"
                            value={nip}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase();
                              if (value === '' || /^[0-9A-F]+$/.test(value)) {
                                const newNips = [...nipFilter];
                                newNips[index] = value;
                                setNipFilter(newNips);
                                if (nipMessage) setNipMessage(null);
                              }
                            }}
                            className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${nip ? 'border-accent/50 bg-accent/5' : ''}`}
                          />
                          {index === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setNipFilter(prev => [...prev, ''])}
                              className="h-8 w-8 p-0 border-accent/30 bg-transparent hover:bg-accent/10"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newNips = nipFilter.filter((_, i) => i !== index);
                                setNipFilter(newNips);
                              }}
                              className="h-8 w-8 p-0 border-destructive/30 bg-transparent hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {nipMessage && (
                        <span className="text-[10px] text-muted-foreground block">{nipMessage}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Authors */}
                <div className="space-y-1">
                  <ClickTooltip
                    content="The event's pubkey must match one of these to be included."
                    showOnLabelClick={true}
                  >
                    <Label className="text-xs font-medium">Author</Label>
                  </ClickTooltip>
                  <div className="space-y-1">
                    {filters.authors.map((author, index) => (
                      <div key={index} className="flex gap-1">
                        <Input
                          type="text"
                          placeholder="npub... or hex"
                          value={author}
                          onChange={(e) => {
                            const newAuthors = [...filters.authors];
                            newAuthors[index] = e.target.value;
                            setFilters(prev => ({ ...prev, authors: newAuthors }));
                          }}
                          className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${author ? 'border-accent/50 bg-accent/5' : ''}`}
                        />
                        {index === 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFilters(prev => ({ ...prev, authors: [...prev.authors, ''] }))}
                            className="h-8 w-8 p-0 border-accent/30 bg-transparent hover:bg-accent/10"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newAuthors = filters.authors.filter((_, i) => i !== index);
                              setFilters(prev => ({ ...prev, authors: newAuthors }));
                            }}
                            className="h-8 w-8 p-0 border-destructive/30 bg-transparent hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Limit */}
                <div className="space-y-1">
                  <ClickTooltip
                    content="Maximum number of events to display. Default: 50 (Search) / 500 (Stream)."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="limit" className="text-xs font-medium">Limit</Label>
                  </ClickTooltip>
                  <Input
                    id="limit"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={filters.limit}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                        setFilters(prev => ({ ...prev, limit: value }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                    }}
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.limit ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <ClickTooltip
                    content="Filter events by specific tags. Format: tagname:value (e.g. id:event-id)"
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="tags" className="text-xs font-medium">Tags</Label>
                  </ClickTooltip>
                  <div className="space-y-1">
                    {filters.tags.map((tag, index) => (
                      <div key={index} className="flex gap-1">
                        <Input
                          id={index === 0 ? "tags" : undefined}
                          type="text"
                          placeholder="id:event-id"
                          value={tag}
                          onChange={(e) => {
                            const newTags = [...filters.tags];
                            newTags[index] = e.target.value;
                            setFilters(prev => ({ ...prev, tags: newTags }));
                          }}
                          className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${tag ? 'border-accent/50 bg-accent/5' : ''}`}
                        />
                        {index === 0 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFilters(prev => ({ ...prev, tags: [...prev.tags, ''] }))}
                            className="h-8 w-8 p-0 border-accent/30 bg-transparent hover:bg-accent/10"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newTags = filters.tags.filter((_, i) => i !== index);
                              setFilters(prev => ({ ...prev, tags: newTags }));
                            }}
                            className="h-8 w-8 p-0 border-destructive/30 bg-transparent hover:bg-destructive/10"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <ClickTooltip
                    content="A timestamp. Only show events newer than this time."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="since" className="text-xs font-medium">Since</Label>
                  </ClickTooltip>
                  <div className="flex gap-1">
                    <Input
                      id="since"
                      type="number"
                      placeholder="timestamp"
                      value={filters.since}
                      onChange={(e) => setFilters(prev => ({ ...prev, since: e.target.value }))}
                      className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${filters.since ? 'border-accent/50 bg-accent/5' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const oneDayAgo = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
                        setFilters(prev => ({ ...prev, since: oneDayAgo.toString() }));
                      }}
                      className="h-8 px-2 text-xs bg-accent/10 border-accent/30 hover:bg-accent/20"
                    >
                      24h
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <ClickTooltip
                    content="A timestamp. Only show events older than this time."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="until" className="text-xs font-medium">Until</Label>
                  </ClickTooltip>
                  <div className="flex gap-1">
                    <Input
                      id="until"
                      type="number"
                      placeholder="timestamp"
                      value={filters.until}
                      onChange={(e) => setFilters(prev => ({ ...prev, until: e.target.value }))}
                      className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 flex-1 ${filters.until ? 'border-accent/50 bg-accent/5' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = Math.floor(Date.now() / 1000);
                        setFilters(prev => ({ ...prev, until: now.toString() }));
                      }}
                      className="h-8 px-2 text-xs bg-accent/10 border-accent/30 hover:bg-accent/20"
                    >
                      Now
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 items-start">
                {mode === 'search' ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-8 px-4 text-xs bg-accent/80 hover:bg-accent border-accent/50"
                    >
                      Search
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      {noRelayHint === 'search' ? 'Enter a relay first' : 'Fetch once'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    {isStreaming ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsStreaming(false)}
                        className="h-8 px-4 text-xs bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="h-8 px-4 text-xs bg-accent/80 hover:bg-accent border-accent/50"
                      >
                        Stream
                      </Button>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {noRelayHint === 'stream' ? 'Enter a relay first' : isStreaming ? 'Stop streaming' : 'Real-time'}
                    </span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    className="h-8 px-4 text-xs bg-accent/10 border-accent/30 hover:bg-accent/20"
                  >
                    Clear Filters
                  </Button>
                  <span className="text-[10px] text-muted-foreground">&nbsp;</span>
                </div>

                <div className="ml-auto flex items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
                  <span><span style={{ color: 'var(--c-accent)' }}>{activeFilters}</span> filter{activeFilters !== 1 ? 's' : ''} active</span>
                  <span>·</span>
                  <span>mode: <span style={{ color: 'var(--c-accent-glow)' }}>{mode}/{queryType}</span></span>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-xl font-semibold text-foreground">
              Events {streamingLabelSuffix}
              {isStreaming && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {streamPhase === 'connecting' && '-- Connecting...'}
                  {streamPhase === 'historical' && '-- Loading stored events...'}
                  {streamPhase === 'live' && '-- Live'}
                </span>
              )}
              {activeFilters > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {isStreaming ? '| ' : '-- '}{activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
                </span>
              )}
            </h2>
            {isLoading && <span className="text-muted-foreground text-sm">Loading...</span>}
          </div>

          {isStreaming && (
            <div className="stream-bar">
              <span className="live-label"><span className="led violet" />LIVE</span>
              <span className="stream-phase">
                {streamPhase === 'connecting' && 'connecting'}
                {streamPhase === 'historical' && 'loading history'}
                {streamPhase === 'live' && 'live'}
              </span>
              {streamPhase === 'live' && (
                <span className="stream-rate">
                  <span className="n">{eventRate}</span> events/sec · <span className="n">{displayEvents.length}</span> captured
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsStreaming(false)}
                className="ml-auto h-7 px-3 text-[10px] tracking-widest border border-destructive/40 text-destructive/80 hover:text-destructive hover:border-destructive rounded bg-transparent"
              >
                ■ STOP
              </button>
            </div>
          )}

          {displayEvents.length > 0 && relayStats.size > 0 && (
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {Array.from(relayStats.entries()).map(([relay, count]) => (
                <Badge key={relay} variant="outline" className="text-xs">
                  {relay.replace('wss://', '').replace('ws://', '')}: {count} event{count !== 1 ? 's' : ''}
                </Badge>
              ))}
            </div>
          )}

          {filters.kinds.some(k => k.trim() !== '') && (
            <div className="kind-info-bar">
              {filters.kinds.filter(k => k.trim() !== '').map((k, index) => {
                const kind = parseInt(k);
                if (isNaN(kind)) return null;
                const info = getKindInfo(kind);
                return (
                  <span key={index} className="inline-flex items-center gap-1">
                    Event kind <strong>{kind}</strong>:{' '}
                    {info.link ? (
                      <a href={info.link} target="_blank" rel="noopener noreferrer">
                        {info.nip} {info.description}
                      </a>
                    ) : (
                      <span>{info.description}</span>
                    )}
                    {' · '}
                    <a
                      href="https://github.com/nostr-protocol/nips/blob/master/01.md#kinds"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {info.classification}
                    </a>
                  </span>
                );
              })}
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {(isLoading || isStreaming) && displayEvents.length === 0 && (
            <Card className="border-accent/20 bg-accent/5">
              <CardContent className="py-12 text-center space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                  <p className="text-foreground font-medium">
                    {isStreaming
                      ? streamPhase === 'connecting' ? 'Connecting to relays...' : 'Loading stored events...'
                      : 'Loading...'}
                  </p>
                </div>
                {validRelays.length > 0 && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Connected to {validRelays.length} relay{validRelays.length !== 1 ? 's' : ''}:</p>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {validRelays.map((relay, idx) => (
                        <code key={idx} className="bg-muted px-2 py-1 rounded text-xs">{relay}</code>
                      ))}
                    </div>
                    <p>Searching for event kinds: <code className="bg-muted px-2 py-1 rounded">
                      {filters.kinds.filter(k => k.trim() !== '').join(', ') || 'all kinds'}
                    </code></p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showEmptyState && validRelays.length === 0 && (
            <div className="empty-state panel-corner">
              <div className="empty-glyph" />
              <h3 className="empty-title">Enter a relay URL to start monitoring</h3>
              <p className="empty-desc">
                Pick a relay below or paste your own <code>wss://</code> endpoint in the Relay field above.
                Then run a query or start streaming.
              </p>
              <div className="quickstart">
                <div className="quickstart-label">// popular relays</div>
                <div className="relay-suggestions">
                  {SUGGESTED_RELAYS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="relay-suggest"
                      onClick={() => addSuggestedRelay(r)}
                    >
                      <span className="plus">+</span> {r}
                    </button>
                  ))}
                </div>
                <div className="quickstart-label">// query presets</div>
                <div className="presets-grid">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="preset-card"
                      onClick={() => applyPreset(p)}
                    >
                      <div className="preset-title">
                        {p.title} <span className="preset-arrow">→</span>
                      </div>
                      <div className="preset-desc">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showEmptyState && validRelays.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">No events found</p>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Connected to {validRelays.length} relay{validRelays.length !== 1 ? 's' : ''}:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {validRelays.map((relay, idx) => (
                      <code key={idx} className="bg-muted px-2 py-1 rounded text-xs">{relay}</code>
                    ))}
                  </div>
                  <p>Searching for event kinds: <code className="bg-muted px-2 py-1 rounded">
                    {filters.kinds.filter(k => k.trim() !== '').join(', ') || 'all kinds'}
                  </code></p>
                  <div className="text-xs space-y-1">
                    <p>💡 <strong>Troubleshooting tips:</strong></p>
                    <ul className="text-left max-w-md mx-auto space-y-1">
                      <li>• Try setting a specific <strong>Kind</strong> (e.g., 1 for notes)</li>
                      <li>• Check if your relay has any events stored</li>
                      <li>• Try removing time filters (Since/Until)</li>
                      <li>• Publish a test event to your relay</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {displayEvents.map((event, index) => (
            <Card key={`${event.id}-${index}`} className="border-accent/20 bg-card/50 backdrop-blur-sm hover:border-accent/40 transition-all duration-200 relative">
              <div className="flex items-start justify-between p-4 pb-0">
                {event.relayUrls.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {event.relayUrls.map((url) => (
                      <Badge
                        key={url}
                        variant="secondary"
                        className="text-xs bg-accent/20 border-accent/40 backdrop-blur-sm"
                      >
                        {url.replace('wss://', '').replace('ws://', '')}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
                  className="h-8 w-8 p-0 opacity-50 hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm shrink-0"
                  aria-label="Copy event to clipboard"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardContent className="p-4 pt-2">
                <JsonViewer data={event} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center py-8 text-sm text-muted-foreground space-y-3">
          <p>
            Vibed by{' '}
            <a
              href="https://github.com/Catrya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Catrya
            </a>
          </p>
          <a
            href="https://github.com/Catrya/Nostr-Events-Monitor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-primary hover:text-primary/80 transition-colors duration-200"
            aria-label="View source code on GitHub"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="hover:scale-110 transition-transform duration-200"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
