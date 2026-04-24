import { useState } from 'react';

export const WALK_STORAGE_KEY = 'nem-walk-seen';

interface WalkthroughProps {
  onClose: () => void;
}

const steps = [
  {
    label: 'Step 01 / 03',
    title: 'Point it at a relay',
    render: () => (
      <>
        Nostr is a network of relays — public servers that hold events. Add at least one{' '}
        <code>wss://</code> URL to query. You can add several and this tool will query them in parallel.
      </>
    ),
  },
  {
    label: 'Step 02 / 03',
    title: 'Filter by Kind or NIP',
    render: () => (
      <>
        Each event has a numeric <code>kind</code>. If you know it, use <strong>Kind</strong>. If not,
        search by <strong>NIP</strong> — the spec number — and we'll resolve its kinds automatically.
        Then narrow with author, tags, or time range.
      </>
    ),
  },
  {
    label: 'Step 03 / 03',
    title: 'Search vs Stream',
    render: () => (
      <>
        <strong>Search</strong> fetches a snapshot (past events, bounded by <code>limit</code>).{' '}
        <strong>Stream</strong> keeps a live socket open and prints new events as they land.
        Use Stream to debug relays or watch a kind in real time.
      </>
    ),
  },
];

export function Walkthrough({ onClose }: WalkthroughProps) {
  const [step, setStep] = useState(0);
  const s = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="walk-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="walk-title"
    >
      <div className="walk-card" onClick={(e) => e.stopPropagation()}>
        <div className="walk-step">{s.label}</div>
        <h2 id="walk-title" className="walk-title">{s.title}</h2>
        <p className="walk-desc">{s.render()}</p>
        <div className="walk-nav">
          <div className="walk-dots">
            {steps.map((_, i) => (
              <span key={i} className={`walk-dot ${i <= step ? 'on' : ''}`} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 text-xs bg-accent/10 border border-accent/30 hover:bg-accent/20 rounded"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onClose() : setStep(step + 1))}
              className="h-8 px-4 text-xs bg-accent/80 hover:bg-accent border-accent/50 rounded"
            >
              {isLast ? 'Start monitoring' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
