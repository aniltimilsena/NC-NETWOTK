import React, { Component, type ErrorInfo, type ReactNode } from "react";
import NotFound from "../pages/NotFound";

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

    public componentDidMount() {
        const url = new URL(window.location.href);
        if (url.searchParams.has('reload')) {
            url.searchParams.delete('reload');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const errorMsg = error?.message || "";
        const isChunkLoadFailed = errorMsg.includes("Failed to fetch dynamically imported module") ||
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
        } catch (_e) {
            // Build version unavailable
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
            try {
                const lastReloaded = sessionStorage.getItem("chunk_fail_reload_time");
                const now = Date.now();
                if (!lastReloaded || now - parseInt(lastReloaded, 10) > 15000) {
                    sessionStorage.setItem("chunk_fail_reload_time", now.toString());
                    console.warn("Dynamic import failure detected in ErrorBoundary. Auto-reloading page with cache-busting...");
                    const url = new URL(window.location.href);
                    url.searchParams.set('reload', Date.now().toString());
                    window.location.href = url.toString();
                }
            } catch (_err) {
                // Storage blocked or unavailable
            }
        }
    }

    private async logError(error: Error, errorInfo: ErrorInfo): Promise<void> {
        try {
            const { AuthService } = await import("../services/AuthService");
            const token = await AuthService.getIdToken().catch(() => null);
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
                    userId: AuthService.getUserId() || 'anonymous',
                }),
            });
        } catch (_e) {
            // Ignore error logging failure
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

    public render() {
        if (this.state.hasError) {
            // In production, display ONLY the plain 404 error page
            if (!import.meta.env.DEV) {
                return <NotFound />;
            }

            // In development, show developer diagnostics view
            const errorMsg = this.state.error?.message || "";
            const isChunkLoadFailed = errorMsg.includes("Failed to fetch dynamically imported module") ||
                errorMsg.includes("Importing a module script failed") ||
                errorMsg.includes("error loading dynamically imported module");
            let localVersion = 'dev';
            try {
                localVersion = __BUILD_VERSION__;
            } catch (_e) {
                // Build version unavailable
            }

            return (
                <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6 text-center relative overflow-hidden font-sans">
                    <div className="max-w-md w-full bg-[#111118] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 relative z-10 text-left">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">Dev Error Boundary</span>
                            <span className="text-[10px] text-gray-500 font-mono">DEV ONLY</span>
                        </div>
                        <h2 className="text-base font-bold text-white tracking-tight">
                            {isChunkLoadFailed ? "Chunk Load Error" : "Runtime Crash"}
                        </h2>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            {errorMsg || "An uncaught runtime error occurred in development."}
                        </p>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={this.handleGoBack}
                                className="flex-1 py-2 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                                Go Back
                            </button>
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="flex-1 py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors cursor-pointer"
                            >
                                Reload
                            </button>
                        </div>
                        {this.state.error && (
                            <div className="mt-3 p-3 rounded-xl bg-black/80 border border-white/5 font-mono text-[10px] text-red-300 max-h-48 overflow-auto whitespace-pre-wrap">
                                {this.state.error.stack || this.state.error.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
