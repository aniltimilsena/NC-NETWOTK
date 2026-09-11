import React, { Component, type ErrorInfo, type ReactNode } from "react";

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

    private handleOnline = () => {
        if (this.state.hasError) {
            this.handleReload();
        }
    };

    public componentDidMount() {
        const url = new URL(window.location.href);
        if (url.searchParams.has('reload')) {
            url.searchParams.delete('reload');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
        window.addEventListener('online', this.handleOnline);
    }

    public componentWillUnmount() {
        window.removeEventListener('online', this.handleOnline);
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const errorMsg = error?.message || "";
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
    }

    private logError(error: Error, errorInfo: ErrorInfo): void {
        try {
            const errorReport = {
                message: error?.message || "Unknown error",
                stack: error?.stack || "No stack",
                componentStack: errorInfo?.componentStack || "No component stack",
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            };
            sessionStorage.setItem("nc_last_crash", JSON.stringify(errorReport));
        } catch (_e) {
            // Ignore storage failures
        }
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.state.hasError && prevProps.children !== this.props.children) {
            this.setState({ hasError: false, error: null, showDetails: false });
        }
    }

    private handleReload = () => {
        try {
            sessionStorage.clear();
            localStorage.removeItem('nc_casting_draft');
            localStorage.removeItem('nc_last_crash');
        } catch (_e) {}
        const url = new URL(window.location.href);
        url.searchParams.set('reload', Date.now().toString());
        window.location.href = url.toString();
    };

    private handleGoBack = () => {
        try {
            sessionStorage.clear();
            localStorage.removeItem('nc_casting_draft');
        } catch (_e) {}
        this.setState({ hasError: false, error: null, showDetails: false });
        window.history.back();
    };

    public render() {
        if (this.state.hasError) {
            const errorMsg = this.state.error?.message || "";
            const isChunkLoadFailed = errorMsg.includes("Failed to fetch dynamically imported module") ||
                errorMsg.includes("Importing a module script failed") ||
                errorMsg.includes("error loading dynamically imported module");
            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

            // In production, display clean styled fallback error page
            if (!import.meta.env.DEV) {
                return (
                    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4 font-sans select-none">
                        <div className="flex flex-col items-center text-center max-w-md space-y-3">
                            <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-white">
                                {isOffline ? "📶" : isChunkLoadFailed ? "⚡" : "500"}
                            </h1>
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                {isOffline ? "You are offline" : isChunkLoadFailed ? "Update Available" : "Something went wrong"}
                            </h2>
                            <p className="text-sm text-[#9ca3af] leading-relaxed max-w-xs pb-4">
                                {isOffline
                                    ? "Please check your internet connection to continue using NepalCasts."
                                    : isChunkLoadFailed
                                    ? "A newer version of NepalCasts is available. Reloading will fetch the latest update."
                                    : "An unexpected error occurred. Please reload the page to continue."}
                            </p>
                            <div className="flex items-center gap-3 w-full justify-center">
                                <button onClick={this.handleReload} type="button" className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-200 text-black font-semibold text-sm transition-all cursor-pointer active:scale-95 shadow-sm">
                                    {isChunkLoadFailed ? "Update & Reload" : "Reload Page"}
                                </button>
                                <a href="/" className="px-5 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-gray-300 hover:text-white font-medium text-sm transition-all cursor-pointer active:scale-95">
                                    Go Home
                                </a>
                            </div>
                        </div>
                    </div>
                );
            }

            // In development, show developer diagnostics view

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
