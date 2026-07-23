import React, { Component, type ErrorInfo, type ReactNode } from "react";
import Button from "./ui/Button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const errorMsg = error?.message || "";
    const isChunkLoadFailed =
      errorMsg.includes("Failed to fetch dynamically imported module") ||
      errorMsg.includes("Importing a module script failed") ||
      errorMsg.includes("error loading dynamically imported module");

    
    let chunkUrl = "Unknown URL";
    const match = errorMsg.match(/https?:\/\/[^\s"']+/);
    if (match) {
      chunkUrl = match[0];
    }

    let localVersion = 'dev';
    try {
      localVersion = __BUILD_VERSION__;
    } catch {
      
    }

    
    if (import.meta.env.DEV) {
      console.error("NepalCasts ErrorBoundary caught an uncaught error:", {
        message: errorMsg,
        chunkUrl,
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        version: localVersion,
        stack: error?.stack || "No stack trace available",
        errorInfo: errorInfo.componentStack
      });
    }

    
    this.logError(error, errorInfo);

    if (isChunkLoadFailed) {
      const lastReloaded = sessionStorage.getItem("chunk_fail_reload_time");
      const now = Date.now();
      
      
      if (!lastReloaded || now - parseInt(lastReloaded, 10) > 15000) {
        sessionStorage.setItem("chunk_fail_reload_time", now.toString());
        console.warn("Dynamic import failure detected in ErrorBoundary. Auto-reloading page with cache-busting...");
        
        const url = new URL(window.location.href);
        url.searchParams.set('reload', Date.now().toString());
        window.location.href = url.toString();
      }
    }
  }

  private async logError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const { auth } = await import("../lib/firebase");
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      await fetch('/api/errors/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          type: 'react_crash',
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          userId: auth.currentUser?.uid || 'anonymous',
        }),
      });
    } catch {
      
    }
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: null, showDetails: false });
    }
  }

  private handleReload = () => {
    
    sessionStorage.clear();
    const url = new URL(window.location.href);
    url.searchParams.set('reload', Date.now().toString());
    window.location.href = url.toString();
  };

  private handleGoBack = () => {
    sessionStorage.clear();
    this.setState({ hasError: false, error: null, showDetails: false });
    window.history.back();
  };

  private toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "";
      const isChunkLoadFailed =
        errorMsg.includes("Failed to fetch dynamically imported module") ||
        errorMsg.includes("Importing a module script failed") ||
        errorMsg.includes("error loading dynamically imported module");

      let localVersion = 'dev';
      try {
        localVersion = __BUILD_VERSION__;
      } catch {
        
      }

      return (
        <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6 text-center relative overflow-hidden">
          {/* Neon glows */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-md w-full bg-[#111118]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
            {isChunkLoadFailed ? (
              
              <>
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center mx-auto mb-4 border border-sky-500/20 animate-pulse">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18v3.582" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Update Required</h2>
                  <p className="text-nc-secondary text-sm leading-relaxed">
                    A new version of NepalCasts has been deployed. A reload is required to fetch the latest application components and settings.
                  </p>
                </div>
              </>
            ) : (
              
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Application Error</h2>
                  <p className="text-nc-secondary text-sm leading-relaxed">
                    NepalCasts experienced an unexpected runtime crash. Try reloading the page or returning to the previous screen.
                  </p>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={this.handleGoBack} className="flex-1 rounded-2xl font-bold py-3">
                Go Back
              </Button>
              <Button variant="primary" size="md" onClick={this.handleReload} className="flex-1 rounded-2xl font-bold py-3">
                {isChunkLoadFailed ? "Update & Reload" : "Reload Page"}
              </Button>
            </div>

            {/* Diagnostics Section */}
            {true && (
              <div className="pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="text-xs text-nc-secondary hover:text-white transition-colors flex items-center gap-1 mx-auto font-medium focus:outline-none"
                >
                  <span>{this.state.showDetails ? "Hide" : "Show"} diagnostics</span>
                  <svg
                    className={`w-3.5 h-3.5 transform transition-transform ${this.state.showDetails ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {this.state.showDetails && (
                  <div className="text-left mt-4 p-4 rounded-2xl bg-black/45 text-nc-secondary font-mono text-[10px] space-y-2 overflow-x-auto max-h-48 border border-white/5 scrollbar-thin">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/40 uppercase font-black text-[8px] tracking-wider">Route</span>
                      <span className="text-white/80">{window.location.pathname}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/40 uppercase font-black text-[8px] tracking-wider">Version</span>
                      <span className="text-white/80">{localVersion}</span>
                    </div>
                    <div className="flex flex-col border-b border-white/5 pb-1">
                      <span className="text-white/40 uppercase font-black text-[8px] tracking-wider mb-1">User Agent</span>
                      <span className="text-white/80 break-all leading-normal">{navigator.userAgent}</span>
                    </div>
                    {this.state.error && (
                      <div className="flex flex-col pt-1">
                        <span className="text-white/40 uppercase font-black text-[8px] tracking-wider mb-1">Error Trace</span>
                        <span className="text-red-400/90 whitespace-pre-wrap leading-normal break-all font-mono text-[10px]">
                          {this.state.error.stack || this.state.error.toString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
