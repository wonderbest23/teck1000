import type { PreviewViewMode } from "@/components/preview3d/types";

export function shouldRenderDoors(viewMode: PreviewViewMode) {
  return viewMode !== "doors_hidden" && viewMode !== "interior";
}

export function isDoorTransparent(viewMode: PreviewViewMode) {
  return viewMode === "transparent_doors" || viewMode === "xray";
}

export function getDoorOpenAngle(viewMode: PreviewViewMode) {
  return viewMode === "doors_open" ? Math.PI * 0.42 : 0;
}

export function shouldShowInteriorHints(viewMode: PreviewViewMode) {
  return viewMode === "interior" || viewMode === "xray" || viewMode === "transparent_doors" || viewMode === "doors_open";
}
