import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Browser translators (e.g. Google Translate) rewrite DOM text nodes, which
// makes React's removeChild/insertBefore fail with a NotFoundError.
function isDomMutationError(error: Error): boolean {
  return error.name === 'NotFoundError' && /removeChild|insertBefore/.test(error.message);
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen text-foreground flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            {isDomMutationError(error)
              ? 'It looks like a browser extension or automatic translation modified the page. Reload to continue.'
              : 'An unexpected error occurred. Reload the page to continue.'}
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
