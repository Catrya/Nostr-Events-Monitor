import type { NostrEvent } from '@nostrify/nostrify';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { addressPath, eventPath, isVersioned } from '@/lib/eventLinks';

/** Round icon button in the top corner of an event card. */
const cardButtonClass =
  'h-8 w-8 p-0 opacity-50 hover:opacity-100 data-[state=open]:opacity-100 transition-opacity duration-200 bg-background/80 border border-border/50 rounded-full shadow-sm shrink-0';

function ShareOption({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <div>{title}</div>
      <div className="text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

/**
 * Copies a link to the event page. Events with versions offer both the exact version
 * (`/e/nevent…`) and the latest one (`/a/naddr…`).
 */
export function ShareEventButton({ event, relays }: { event: NostrEvent; relays: string[] }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const copy = (path: string) => copyToClipboard(window.location.origin + path);
  const icon = isCopied ? <Check className="h-4 w-4 text-ok" /> : <Link2 className="h-4 w-4" />;

  if (!isVersioned(event.kind)) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => copy(eventPath(event, relays))}
        className={cardButtonClass}
        aria-label="Copy link to event"
      >
        {icon}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cardButtonClass} aria-label="Copy link to event">
          {icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onSelect={() => copy(eventPath(event, relays))}>
          <ShareOption title="Link to this version" detail="This exact event, as you see it now" />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => copy(addressPath(event, relays))}>
          <ShareOption title="Link to latest version" detail="Keeps working when the author updates it" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Copies the event JSON. Each card has its own copied state. */
export function CopyEventButton({ event }: { event: NostrEvent }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(JSON.stringify(event, null, 2))}
      className={cardButtonClass}
      aria-label="Copy event to clipboard"
    >
      {isCopied ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
