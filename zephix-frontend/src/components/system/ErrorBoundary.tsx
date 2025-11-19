import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<{children: ReactNode},{hasError:boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any, info: any) {
    // eslint-disable-next-line no-console
    console.error("UI ErrorBoundary", err, info);
  }
  render() {
    if (this.state.hasError) return <div className="p-4">Something went wrong.</div>;
    return this.props.children;
  }
}
