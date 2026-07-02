import type { PreviewViewMode } from "@/components/preview3d/types";

/** 선택 레이어 X-ray — 측면·후면에서도 내부(선반·서랍)가 보이도록 */
export const INTERIOR_SHELL_OPACITY = 0.22;
export const INTERIOR_FRONT_OPACITY = 0.3;

export function shouldRenderDoors(viewMode: PreviewViewMode) {
  return viewMode !== "doors_hidden" && viewMode !== "interior";
}

export function isDoorTransparent(viewMode: PreviewViewMode, revealInterior = false) {
  return revealInterior || viewMode === "transparent_doors" || viewMode === "xray";
}

export function getDoorOpenAngle(viewMode: PreviewViewMode) {
  return viewMode === "doors_open" ? Math.PI * 0.42 : 0;
}

export function shouldShowInteriorHints(viewMode: PreviewViewMode, revealInterior = false) {
  return (
    revealInterior ||
    viewMode === "interior" ||
    viewMode === "xray" ||
    viewMode === "transparent_doors" ||
    viewMode === "doors_open"
  );
}

/** 선택된 칸만 문짝·몸통을 반투명 — Orbit 회전 시에도 내부 확인 */
export function resolveModuleViewMode(viewMode: PreviewViewMode, revealInterior: boolean): PreviewViewMode {
  if (!revealInterior) return viewMode;
  if (viewMode === "doors_open" || viewMode === "xray" || viewMode === "transparent_doors") return viewMode;
  return "transparent_doors";
}

export function carcassShellProps(revealInterior: boolean): { transparent?: boolean; opacity?: number } {
  return revealInterior ? { transparent: true, opacity: INTERIOR_SHELL_OPACITY } : {};
}

export function frontPanelProps(revealInterior: boolean, active: boolean): { transparent?: boolean; opacity?: number } {
  if (!revealInterior || active) return {};
  return { transparent: true, opacity: INTERIOR_FRONT_OPACITY };
}
