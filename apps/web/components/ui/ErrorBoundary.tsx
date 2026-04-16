"use client";

import { Component, ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Something went wrong." };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Something went wrong</p>
            <p className="text-xs text-red-500">{this.state.message}</p>
            <button
              className="rounded-md bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
              onClick={() => this.setState({ hasError: false, message: "" })}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
