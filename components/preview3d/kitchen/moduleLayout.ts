import { getKitchenFullSetModelScale } from "@/components/preview3d/camera/fitCamera";
import { clampModuleIndex } from "@/lib/kitchen";

export function getModuleCenterX(modulesMm: number[], moduleIndex: number) {
  const safeIndex = clampModuleIndex(moduleIndex, modulesMm.length - 1);
  const totalWidthM = modulesMm.reduce((sum, width) => sum + width, 0) / 1000;
  const leftEdge = -totalWidthM / 2;
  const beforeWidthM = modulesMm.slice(0, safeIndex).reduce((sum, width) => sum + width, 0) / 1000;
  return leftEdge + beforeWidthM + modulesMm[safeIndex] / 2000;
}

export function getModuleIndexFromRatio(ratio: number, modulesMm: number[]) {
  const totalWidth = modulesMm.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= 0) return 0;
  const target = ratio * totalWidth;
  let acc = 0;
  for (let index = 0; index < modulesMm.length; index += 1) {
    acc += modulesMm[index];
    if (target <= acc) return index;
  }
  return Math.max(0, modulesMm.length - 1);
}

export function getXFromRatio(modulesMm: number[], ratio: number) {
  const totalWidthM = modulesMm.reduce((sum, width) => sum + width, 0) / 1000;
  const leftEdge = -totalWidthM / 2;
  return leftEdge + totalWidthM * Math.min(Math.max(ratio, 0), 1);
}

export function getModuleCenterRatio(modulesMm: number[], moduleIndex: number) {
  const safeIndex = clampModuleIndex(moduleIndex, modulesMm.length - 1);
  const totalWidth = modulesMm.reduce((sum, width) => sum + width, 0);
  if (totalWidth <= 0) return 0.5;
  const before = modulesMm.slice(0, safeIndex).reduce((sum, width) => sum + width, 0);
  return (before + modulesMm[safeIndex] / 2) / totalWidth;
}

export function remapIndexByMove(index: number, from: number, to: number) {
  if (from === to) return index;
  if (index === from) return to;
  if (from < to) {
    if (index > from && index <= to) return index - 1;
    return index;
  }
  if (index >= to && index < from) return index + 1;
  return index;
}

export function getKitchenSceneFrameScale(totalWidthMm: number) {
  const totalWidthM = totalWidthMm / 1000;
  const modelScale = getKitchenFullSetModelScale(totalWidthM);
  return { totalWidthM, modelScale };
}
