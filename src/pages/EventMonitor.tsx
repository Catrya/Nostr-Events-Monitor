import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NostrEvent, NRelay1, NostrFilter } from '@nostrify/nostrify';
import { nip19 } from 'nostr-tools';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClickTooltip } from '@/components/ClickTooltip';
import { JsonViewer } from '@/components/JsonViewer';
import { Copy, Check } from 'lucide-react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

interface EventFilters {
  relay: string;
  kind: string;
  limit: string;
  author: string;
  since: string;
  until: string;
  tags: string;
}

// Helper function to decode npub to hex pubkey
function decodeAuthor(author: string): string {
  if (!author) return '';
  
  // If it starts with npub, decode it
  if (author.startsWith('npub')) {
    try {
      const decoded = nip19.decode(author);
      if (decoded.type === 'npub') {
        return decoded.data;
      }
    } catch {
      // If decoding fails, return original
      return author;
    }
  }
  
  // Return as-is (assuming it's already hex)
  return author;
}

// Helper function to normalize relay URL by adding wss:// protocol if none is present
function normalizeRelayUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  
  // Check if it already has a protocol
  if (trimmed.includes('://')) {
    return trimmed;
  }
  
  // Always use wss:// for secure connections
  return `wss://${trimmed}`;
}

// Helper function to validate WebSocket URL
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
    relay: '',
    kind: '',
    limit: '',
    author: '',
    since: '',
    until: '',
    tags: ''
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamEvents, setStreamEvents] = useState<NostrEvent[]>([]);
  const [lastDisplayedEvents, setLastDisplayedEvents] = useState<NostrEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const relayRef = useRef<NRelay1 | null>(null);
  const previousFiltersRef = useRef<NostrFilter>({});
  const previousRelayRef = useRef<string>(filters.relay);
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  // Memoize query filters to prevent unnecessary recalculations
  const queryFilters = useMemo(() => {
    const qf: NostrFilter = {};
    
    if (filters.kind) {
      qf.kinds = [parseInt(filters.kind)];
    }
    
    if (filters.author) {
      qf.authors = [decodeAuthor(filters.author)];
    }
    
    if (filters.since) {
      qf.since = parseInt(filters.since);
    }
    
    if (filters.until) {
      qf.until = parseInt(filters.until);
    }
    
    if (filters.tags) {
      // Parse tags in format "tagname:value,tagname2:value2"
      const tagPairs = filters.tags.split(',').map(pair => pair.trim()).filter(Boolean);
      for (const pair of tagPairs) {
        const [tagName, tagValue] = pair.split(':').map(s => s.trim());
        if (tagName && tagValue) {
          const filterKey = `#${tagName}` as keyof NostrFilter;
          qf[filterKey] = [tagValue] as never;
        }
      }
    }
    
    // Apply limit - for streaming use specified limit or default
    if (filters.limit) {
      qf.limit = parseInt(filters.limit);
    } else {
      qf.limit = 50; // Default for streaming
    }
    
    return qf;
  }, [filters.kind, filters.author, filters.since, filters.until, filters.tags, filters.limit]);

  // Query for limited events
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['events', filters.relay, filters.kind, filters.limit, filters.author, filters.since, filters.until, filters.tags],
    queryFn: async (c) => {
      if (!isValidWebSocketUrl(filters.relay)) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);
      
      // Create a relay connection with normalized URL
      const normalizedRelayUrl = normalizeRelayUrl(filters.relay);
      const relay = new NRelay1(normalizedRelayUrl);
      
      // Build query filters specifically for this query
      const qf: NostrFilter = {};
      
      if (filters.kind) {
        qf.kinds = [parseInt(filters.kind)];
      }
      
      if (filters.author) {
        qf.authors = [decodeAuthor(filters.author)];
      }
      
      if (filters.since) {
        qf.since = parseInt(filters.since);
      }
      
      if (filters.until) {
        qf.until = parseInt(filters.until);
      }
      
      if (filters.tags) {
        // Parse tags in format "tagname:value,tagname2:value2"
        const tagPairs = filters.tags.split(',').map(pair => pair.trim()).filter(Boolean);
        for (const pair of tagPairs) {
          const [tagName, tagValue] = pair.split(':').map(s => s.trim());
          if (tagName && tagValue) {
            const filterKey = `#${tagName}` as keyof NostrFilter;
            qf[filterKey] = [tagValue] as never;
          }
        }
      }
      
      // IMPORTANT: Apply the limit for queries (not streaming)
      if (filters.limit) {
        qf.limit = parseInt(filters.limit);
      } else {
        // Set a reasonable default limit for discovery
        qf.limit = 50;
      }
      
      try {
        console.log('Querying relay with filters:', qf);
        const events = await relay.query([qf], { signal });
        console.log('Query result:', events.length, 'events');
        if (events.length > 0) {
          const kinds = [...new Set(events.map(e => e.kind))];
          console.log('Event kinds found:', kinds);
        }
        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
        setLastDisplayedEvents(sortedEvents);
        return sortedEvents;
      } catch (error) {
        console.error('Query failed:', error);
        console.error('Query error type:', typeof error);
        console.error('Query error details:', error);
        
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = `Connection timed out after 10 seconds. Relay might be slow to respond.`;
          } else {
            errorMessage = error.message;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
        
        throw new Error(`Failed to connect to relay: ${errorMessage}. Check if relay is running on ${normalizedRelayUrl}`);
      } finally {
        relay.close();
      }
    },
    enabled: isValidWebSocketUrl(filters.relay) && !!filters.limit,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle streaming with optimized dependencies
  useEffect(() => {
    if (!isStreaming || !isValidWebSocketUrl(filters.relay)) return;

    // Only clear events when filters or relay have actually changed
    const currentFiltersString = JSON.stringify(queryFilters);
    const previousFiltersString = JSON.stringify(previousFiltersRef.current);
    const relayChanged = filters.relay !== previousRelayRef.current;
    
    if (currentFiltersString !== previousFiltersString || relayChanged) {
      setStreamEvents([]);
      setLastDisplayedEvents([]);
      previousFiltersRef.current = { ...queryFilters };
      previousRelayRef.current = filters.relay;
    }
    
    // Create a relay connection for streaming with normalized URL
    const normalizedRelayUrl = normalizeRelayUrl(filters.relay);
    const relay = new NRelay1(normalizedRelayUrl);
    relayRef.current = relay;

    // Start streaming
    const controller = new AbortController();
    
    console.log('Starting stream with filters:', queryFilters);
    relay.query([queryFilters], { signal: controller.signal })
      .then(events => {
        console.log('Stream query result:', events.length, 'events');
        if (events.length > 0) {
          const kinds = [...new Set(events.map(e => e.kind))];
          console.log('Stream event kinds found:', kinds);
        }
        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
        setStreamEvents(sortedEvents);
        setLastDisplayedEvents(sortedEvents);
        setError(null);
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          console.error('Streaming error:', error);
          setError(`Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

    return () => {
      controller.abort();
      relay.close();
      relayRef.current = null;
    };
  }, [isStreaming, filters.relay, queryFilters]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!filters.relay) return;
    
    setError(null);
    
    if (filters.limit) {
      setIsStreaming(false);
      refetch();
    } else {
      setIsStreaming(true);
    }
  }, [filters.relay, filters.limit, refetch]);


  // Auto-start streaming when relay is provided and no limit is set
  useEffect(() => {
    if (filters.relay && !filters.limit) {
      setIsStreaming(true);
    } else if (filters.limit) {
      setIsStreaming(false);
    }
  }, [filters.relay, filters.limit]);


  const displayEvents = useMemo(() => {
    if (isStreaming) {
      // During streaming, if we have no stream events yet but have last displayed events,
      // show the last displayed events to avoid showing 0 count
      if (streamEvents.length === 0 && lastDisplayedEvents.length > 0) {
        return lastDisplayedEvents;
      }
      return streamEvents;
    }
    // When there's a limit specified, use query results, otherwise use last displayed
    if (filters.limit) {
      return events || [];
    }
    return lastDisplayedEvents;
  }, [isStreaming, streamEvents, filters.limit, events, lastDisplayedEvents]);
  
  // Count active filters
  const activeFilters = useMemo(() => {
    return [
      filters.kind && 'kind',
      filters.author && 'author', 
      filters.since && 'since',
      filters.until && 'until',
      filters.tags && 'tags'
    ].filter(Boolean).length;
  }, [filters.kind, filters.author, filters.since, filters.until, filters.tags]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-foreground font-semibold">
              Nostr Events Monitor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <ClickTooltip 
                    content="Nostr relay URL. You can enter 'relay.damus.io' or 'wss://relay.damus.io' - both formats are accepted."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="relay" className="text-xs font-medium">
                      Relay <span className="text-red-400">*</span>
                    </Label>
                  </ClickTooltip>
                  <Input
                    id="relay"
                    type="text"
                    placeholder="relay.damus.io or wss://relay.damus.io"
                    value={filters.relay}
                    onChange={(e) => setFilters(prev => ({ ...prev, relay: e.target.value }))}
                    required
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.relay ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
                </div>
                
                <div className="space-y-1">
                  <ClickTooltip 
                    content="A list of kind numbers, each representing a type of Nostr event."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="kind" className="text-xs font-medium">Kind</Label>
                  </ClickTooltip>
                  <Input
                    id="kind"
                    type="number"
                    min="0"
                    placeholder="leave empty for all kinds"
                    value={filters.kind}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow empty string or non-negative numbers
                      if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                        setFilters(prev => ({ ...prev, kind: value }));
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent minus key from being entered
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.kind ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
                </div>
                
                <div className="space-y-1">
                  <ClickTooltip 
                    content="The event's pubkey must match one of these to be included."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="author" className="text-xs font-medium">Author</Label>
                  </ClickTooltip>
                  <Input
                    id="author"
                    type="text"
                    placeholder="npub... or hex"
                    value={filters.author}
                    onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.author ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
                </div>
                
                <div className="space-y-1">
                  <ClickTooltip 
                    content="Maximum number of events to return."
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
                      // Only allow empty string or non-negative numbers
                      if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                        setFilters(prev => ({ ...prev, limit: value }));
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent minus key from being entered
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.limit ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <ClickTooltip 
                    content="Filter events by specific tags."
                    showOnLabelClick={true}
                  >
                    <Label htmlFor="tags" className="text-xs font-medium">Tags</Label>
                  </ClickTooltip>
                  <Input
                    id="tags"
                    type="text"
                    placeholder="t:bitcoin,p:pubkey"
                    value={filters.tags}
                    onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value }))}
                    className={`h-8 text-xs bg-background/50 border-accent/30 focus:border-accent/50 ${filters.tags ? 'border-accent/50 bg-accent/5' : ''}`}
                  />
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
              
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={!filters.relay || isStreaming} className="h-8 px-4 text-xs bg-accent/80 hover:bg-accent border-accent/50">
                  {isStreaming ? 'Streaming...' : (filters.limit ? 'Fetch Events' : 'Start Stream')}
                </Button>
                {isStreaming && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsStreaming(false)}
                    className="h-8 px-4 text-xs bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                  >
                    Stop Searching
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setFilters(prev => ({ 
                    relay: prev.relay, 
                    kind: '', 
                    limit: '', 
                    author: '', 
                    since: '', 
                    until: '', 
                    tags: '' 
                  }))}
                  className="h-8 px-4 text-xs bg-accent/10 border-accent/30 hover:bg-accent/20"
                >
                  Clear Filters
                </Button>
              </div>
              </form>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Events {isStreaming ? '(Live Stream)' : `(${displayEvents.length})`}
              {activeFilters > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  • {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
                </span>
              )}
            </h2>
            {isLoading && <span className="text-muted-foreground">Loading...</span>}
          </div>

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
                    {isStreaming ? 'Searching for events...' : 'Loading...'}
                  </p>
                </div>
                {filters.relay && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Connected to: <code className="bg-muted px-2 py-1 rounded">{filters.relay}</code></p>
                    <p>Searching for event kinds: <code className="bg-muted px-2 py-1 rounded">
                      {filters.kind ? filters.kind : 'all kinds'}
                    </code></p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {displayEvents.length === 0 && !isLoading && !isStreaming && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted-foreground">
                  {filters.relay ? 'No events found' : 'Enter a relay URL to start monitoring'}
                </p>
                {filters.relay && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>Connected to: <code className="bg-muted px-2 py-1 rounded">{filters.relay}</code></p>
                    <p>Searching for event kinds: <code className="bg-muted px-2 py-1 rounded">
                      {filters.kind ? filters.kind : 'all kinds'}
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
                )}
              </CardContent>
            </Card>
          )}

          {displayEvents.map((event, index) => (
            <Card key={`${event.id}-${index}`} className="border-accent/20 bg-card/50 backdrop-blur-sm hover:border-accent/40 transition-all duration-200 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
                className="absolute top-1 right-1 h-8 w-8 p-0 opacity-50 hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 z-10 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full shadow-sm"
                aria-label="Copy event to clipboard"
              >
                {isCopied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <CardContent className="p-4">
                <JsonViewer data={event} />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center py-8 text-sm text-muted-foreground space-y-3">
          <p>
            Vibed by{" "}
            <a 
              href="https://github.com/Catrya" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Catrya
            </a>
            {" "}with{" "}
            <a 
              href="https://soapbox.pub/mkstack" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              MKStack
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