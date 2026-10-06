import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Thrower({ error }: { error: Error }): never {
  throw error;
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>
    );

    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders a fallback with a reload button when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Thrower error={new Error('boom')} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('mentions translation when the error comes from DOM mutation', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.");
    error.name = 'NotFoundError';

    render(
      <ErrorBoundary>
        <Thrower error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/automatic translation/)).toBeInTheDocument();
  });
});
