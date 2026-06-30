"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };

type State = { hasError: boolean };

export class PreviewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Preview3D]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl bg-slate-100 p-6 text-center">
            <div className="text-sm font-black text-slate-700">3D 미리보기를 불러오지 못했습니다</div>
            <div className="mt-2 text-xs text-slate-500">WebGL 또는 그래픽 드라이버 문제일 수 있습니다. 페이지를 새로고침해 주세요.</div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
