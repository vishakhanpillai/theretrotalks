import { Component, type ErrorInfo, type ReactNode } from "react";
import { Film, RotateCcw, Home, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("The Retro Talks - Uncaught Error Boundary exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#07080a] text-zinc-200 flex flex-col items-center justify-center p-6 selection:bg-[#ff5500] selection:text-black font-poppins relative overflow-hidden">
          {/* Subtle Ambient Film Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#ff5500]/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative w-full max-w-lg bg-[#090b0e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_60px_rgba(255,85,0,0.1)] text-center space-y-6">
            
            {/* Projector Emblem */}
            <div className="w-16 h-16 rounded-2xl bg-[#ff5500]/15 border border-[#ff5500]/30 flex items-center justify-center text-[#ff5500] mx-auto shadow-[0_0_30px_rgba(255,85,0,0.3)]">
              <Film className="w-8 h-8 animate-pulse stroke-[2.2]" />
            </div>

            {/* Error Copy */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-[#ff5500] font-bold">
                Cinema Projection Interrupted
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                Projector Jammed
              </h1>
              <p className="text-xs sm:text-sm font-inter text-zinc-400 leading-relaxed max-w-md mx-auto">
                An unexpected technical glitch occurred while rendering the cinema reel. Don't worry, your reviews and database records are safe.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff5500] hover:bg-[#ff6a1a] active:scale-[0.98] text-black font-semibold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(255,85,0,0.3)]"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Reel
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.98] text-zinc-300 font-medium text-xs uppercase tracking-wider transition"
              >
                <Home className="w-4 h-4" />
                Return to Lobby
              </button>
            </div>

            {/* Collapsible Technician Diagnostics */}
            <div className="pt-2 border-t border-white/5 text-left">
              <button
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-400 py-1"
              >
                <span>Technician Diagnostics</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] text-red-400/90 overflow-x-auto max-h-48 space-y-2">
                  <p className="font-semibold text-red-300">
                    {this.state.error?.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-zinc-500 text-[10px] whitespace-pre-wrap leading-relaxed">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
