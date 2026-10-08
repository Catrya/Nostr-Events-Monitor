import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const TOUR_STORAGE_KEY = 'nostr-inspect:tour-seen';

export interface TourStep {
  /** Matches the `data-tour` attribute of the element(s) to highlight; several elements can share it. */
  id: string;
  title: string;
  body: ReactNode;
}

interface GuidedTourProps {
  steps: TourStep[];
  onClose: () => void;
  /** Lets the page show an element that a step needs before it is measured. */
  onStepChange?: (id: string) => void;
}

interface Box { top: number; left: number; width: number; height: number }

/** Space between the highlighted element and the spotlight edge. */
const PAD = 8;
/** Space between the spotlight and the popover, and from the popover to the viewport edges. */
const GAP = 14;
const EDGE = 16;

/** One padded box per element of the step. */
function measure(id: string): Box[] {
  return [...document.querySelectorAll(`[data-tour="${id}"]`)].map(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
  });
}

/** The smallest box around all the step's boxes: what the popover is placed against. */
function union(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const top = Math.min(...boxes.map(b => b.top));
  const left = Math.min(...boxes.map(b => b.left));
  const bottom = Math.max(...boxes.map(b => b.top + b.height));
  const right = Math.max(...boxes.map(b => b.left + b.width));
  return { top, left, width: right - left, height: bottom - top };
}

/** Below the spotlight if it fits, else above, else pinned to the bottom of the viewport. */
function placePopover(spot: Box | null, size: { width: number; height: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(360, vw - EDGE * 2);
  if (!spot) return { top: Math.max(EDGE, (vh - size.height) / 2), left: (vw - width) / 2, width };
  const left = Math.min(Math.max(spot.left, EDGE), vw - width - EDGE);
  const below = spot.top + spot.height + GAP;
  if (below + size.height <= vh - EDGE) return { top: below, left, width };
  const above = spot.top - GAP - size.height;
  if (above >= EDGE) return { top: above, left, width };
  return { top: vh - size.height - EDGE, left, width };
}

/**
 * Step-by-step tour over the live page: dims everything except the element of the current step
 * and explains it in a popover next to it.
 */
export function GuidedTour({ steps, onClose, onStepChange }: GuidedTourProps) {
  const [index, setIndex] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [popover, setPopover] = useState<{ top: number; left: number; width: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  const next = useCallback(() => (isLast ? onClose() : setIndex(i => i + 1)), [isLast, onClose]);
  const back = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  useEffect(() => { onStepChange?.(step.id); }, [step.id, onStepChange]);

  // Bring the step's element into view, then follow it while the page scrolls or resizes
  useEffect(() => {
    let frame = 0;
    let tries = 0;
    const update = () => setBoxes(measure(step.id));
    const start = () => {
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      // The page may need a frame to render an element this step asked for
      if (!el && tries++ < 10) { frame = requestAnimationFrame(start); return; }
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      // To the top (below the sticky topbar, see scroll-margin-top), so the popover fits underneath
      el?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      update();
    };
    start();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [step.id]);

  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (el) setPopover(placePopover(union(boxes), { width: el.offsetWidth, height: el.offsetHeight }));
  }, [boxes, index]);

  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, next, back]);

  return createPortal(
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Blocks the page during the tour; dims it when the step has nothing to highlight */}
      <div className={`tour-blocker ${boxes.length ? '' : 'dim'}`} />
      {boxes.length > 0 && (
        // The dim layer has one rounded hole per highlighted element
        <svg className="tour-mask" aria-hidden="true">
          <defs>
            <mask id="tour-holes">
              <rect width="100%" height="100%" fill="white" />
              {boxes.map((b, i) => <rect key={i} x={b.left} y={b.top} width={b.width} height={b.height} rx={12} fill="black" />)}
            </mask>
          </defs>
          <rect width="100%" height="100%" mask="url(#tour-holes)" />
        </svg>
      )}
      {boxes.map((b, i) => <div key={`${step.id}-${i}`} className="tour-spotlight" style={b} />)}
      <div
        ref={popoverRef}
        className="tour-popover"
        style={popover ?? { visibility: 'hidden', top: 0, left: 0 }}
      >
        <div key={`count-${index}`} className="tour-count">{`Step ${index + 1} of ${steps.length}`}</div>
        <h2 key={`title-${index}`} id="tour-title" className="tour-title">{step.title}</h2>
        <div key={`body-${index}`} className="tour-body">{step.body}</div>
        <div className="tour-nav">
          <button type="button" className="tour-skip" onClick={onClose}>Skip</button>
          <div className="tour-dots" aria-hidden="true">
            {steps.map((s, i) => <span key={s.id} className={i === index ? 'on' : ''} />)}
          </div>
          <div className="tour-actions">
            {index > 0 && <button type="button" className="tour-btn" onClick={back}>Back</button>}
            <button ref={nextRef} type="button" className="tour-btn primary" onClick={next}>
              {isLast ? 'Start exploring' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
