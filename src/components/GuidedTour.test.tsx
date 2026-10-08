import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GuidedTour, type TourStep } from './GuidedTour';

const steps: TourStep[] = [
  { id: 'one', title: 'First step', body: 'About the first thing' },
  { id: 'two', title: 'Second step', body: 'About the second thing' },
];

function renderTour(onClose = vi.fn(), onStepChange = vi.fn()) {
  render(
    <>
      <div data-tour="one">first target</div>
      <div data-tour="two">second target</div>
      <GuidedTour steps={steps} onClose={onClose} onStepChange={onStepChange} />
    </>
  );
  return { onClose, onStepChange };
}

describe('GuidedTour', () => {
  it('walks through the steps with Next and Back', () => {
    const { onClose, onStepChange } = renderTour();

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('First step')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith('one');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Second step')).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith('two');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('First step')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start exploring' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('highlights the element of the current step', () => {
    renderTour();

    expect(document.querySelector('.tour-spotlight')).not.toBeNull();
    expect(document.querySelector('.tour-blocker.dim')).toBeNull();
  });

  it('highlights every element that shares the step id', () => {
    render(
      <>
        <div data-tour="many">a</div>
        <div data-tour="other">b</div>
        <div data-tour="many">c</div>
        <GuidedTour steps={[{ id: 'many', title: 'Several places', body: '' }]} onClose={vi.fn()} />
      </>
    );

    expect(document.querySelectorAll('.tour-spotlight')).toHaveLength(2);
    expect(document.querySelectorAll('mask#tour-holes rect[fill="black"]')).toHaveLength(2);
  });

  it('dims the whole page when the step has no element to highlight', () => {
    render(<GuidedTour steps={[{ id: 'missing', title: 'Nothing here', body: '' }]} onClose={vi.fn()} />);

    expect(document.querySelector('.tour-spotlight')).toBeNull();
    expect(document.querySelector('.tour-blocker.dim')).not.toBeNull();
  });

  it('closes with Skip and with Escape, and moves with the arrow keys', () => {
    const { onClose } = renderTour();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('Second step')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('First step')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
