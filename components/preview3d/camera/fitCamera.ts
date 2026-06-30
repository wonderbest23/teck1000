import {
  KITCHEN_WALL_BOTTOM_M,
  KITCHEN_WALL_HEIGHT_M,
} from "@/components/preview3d/constants";
import type { OrthographicCamera as OrthographicCameraImpl, PerspectiveCamera as PerspectiveCameraImpl } from "three";
import type { SceneFrame } from "@/components/preview3d/types";

/** 주방 세트 3D 콘텐츠 바닥(y=0) ~ 상부장 상단 */
export function getKitchenFullSetContentHeightM() {
  return KITCHEN_WALL_BOTTOM_M + KITCHEN_WALL_HEIGHT_M + 0.06;
}

export function getKitchenFullSetModelScale(totalWidthM: number) {
  return Math.min(1, 1.65 / Math.max(totalWidthM, 1));
}

export function fitPerspectiveCameraToFrame(
  camera: PerspectiveCameraImpl,
  frame: SceneFrame,
  viewport: { width: number; height: number },
  freeView: boolean,
) {
  const aspect = viewport.width / Math.max(viewport.height, 1);
  const verticalFov = (camera.fov * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const padding = viewport.width < 500 ? 1.2 : 1.08;

  const halfH = (frame.heightM / 2) * padding;
  const halfW = (frame.widthM / 2) * padding;
  const distance = Math.max(
    halfH / Math.tan(verticalFov / 2),
    halfW / Math.tan(horizontalFov / 2),
    frame.minDistance ?? 1.4,
  );

  const [cx, cy, cz] = frame.center;
  const [tx, ty, tz] = frame.target;

  if (freeView) {
    camera.position.set(cx + distance * 0.58, cy + distance * 0.1, cz + distance * 0.72);
  } else {
    camera.position.set(cx, cy, cz + distance);
  }
  camera.lookAt(tx, ty, tz);
  camera.updateProjectionMatrix();
}

export function applyOrthoFrame(
  camera: OrthographicCameraImpl,
  frame: SceneFrame,
  viewport: { width: number; height: number },
) {
  const aspect = viewport.width / Math.max(viewport.height, 1);
  const padding = viewport.width < 500 ? 1.12 : 1.04;
  const halfW = (frame.widthM / 2) * padding;
  const halfH = (frame.heightM / 2) * padding;
  const centerX = frame.center[0];
  const centerY = frame.center[1];

  let viewHalfW = halfW;
  let viewHalfH = halfH;
  const contentAspect = frame.widthM / Math.max(frame.heightM, 0.001);

  if (aspect >= contentAspect) {
    viewHalfH = halfH;
    viewHalfW = viewHalfH * aspect;
  } else {
    viewHalfW = halfW;
    viewHalfH = viewHalfW / aspect;
  }

  camera.left = centerX - viewHalfW;
  camera.right = centerX + viewHalfW;
  camera.top = centerY + viewHalfH;
  camera.bottom = centerY - viewHalfH;
  camera.zoom = 1;
  camera.near = 0.1;
  camera.far = 100;
  camera.position.set(centerX, centerY, frame.center[2] + 10);
  camera.lookAt(frame.target[0], centerY, frame.target[2]);
  camera.updateProjectionMatrix();
}
