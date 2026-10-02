import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);

    // Auto-recover from dynamic module chunk load failures (e.g. after fresh deployments)
    const isChunkLoadError = 
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Importing a module script failed") ||
      error.name === "ChunkLoadError";

    if (isChunkLoadError) {
      const hasRetried = sessionStorage.getItem("chunk_retry_attempt");
      if (!hasRetried) {
        sessionStorage.setItem("chunk_retry_attempt", "true");
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    sessionStorage.removeItem("chunk_retry_attempt");
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-xs text-muted-foreground max-w-md mb-6 leading-relaxed">
            The page encountered an unexpected issue while loading assets. Reloading usually resolves this immediately.
          </p>
          <Button
            onClick={this.handleReload}
            className="bg-primary text-primary-foreground font-bold text-xs h-10 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm hover:opacity-90"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
