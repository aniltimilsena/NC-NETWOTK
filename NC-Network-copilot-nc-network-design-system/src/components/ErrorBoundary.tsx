import React, { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "./ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-nc-dark flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-nc-card border border-nc-border rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Something went wrong</h2>
              <p className="text-nc-secondary text-sm leading-relaxed">
                The page failed to load or experienced a runtime error. This might be due to a temporary network issue.
              </p>
              {this.state.error && (
                <div className="text-left mt-4 p-3 rounded-lg bg-black/40 text-red-400 font-mono text-xs overflow-x-auto max-h-32 border border-red-500/10">
                  {this.state.error.toString()}
                </div>
              )}
            </div>
            <Button variant="primary" size="md" onClick={this.handleReload} className="w-full">
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
