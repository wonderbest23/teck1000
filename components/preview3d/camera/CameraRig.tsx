"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { fitPerspectiveCameraToFrame } from "@/components/preview3d/camera/fitCamera";
import type { SceneFrame } from "@/components/preview3d/types";
import type { PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { Vector3 } from "three";

function buildRigFrame(frame: SceneFrame, panX: number): SceneFrame {
  return {
    ...frame,
    center: [panX, frame.center[1], frame.center[2]],
    target: [panX, frame.target[1], frame.target[2]],
  };
}

export function CameraRig({ frame, freeView }: { frame: SceneFrame; freeView: boolean }) {
  const { camera, size } = useThree();
  const panX = useRef(frame.center[0]);
  const focusKey = useRef("");

  useLayoutEffect(() => {
    const nextKey = freeView
      ? `free:${frame.widthM.toFixed(3)}:${frame.heightM.toFixed(3)}:${frame.depthM.toFixed(3)}:${frame.center[1].toFixed(3)}:${frame.center[2].toFixed(3)}:${size.width}:${size.height}`
      : `front:${frame.center[0].toFixed(4)}:${frame.center[1].toFixed(4)}:${frame.widthM.toFixed(4)}:${frame.heightM.toFixed(4)}:${size.width}:${size.height}`;
    if (nextKey === focusKey.current) return;
    focusKey.current = nextKey;
    panX.current = frame.center[0];
    if (freeView) {
      fitPerspectiveCameraToFrame(
        camera as PerspectiveCameraImpl,
        buildRigFrame(frame, panX.current),
        size,
        true,
      );
      return;
    }
    fitPerspectiveCameraToFrame(
      camera as PerspectiveCameraImpl,
      buildRigFrame(frame, panX.current),
      size,
      false,
    );
  }, [camera, frame.center[0], frame.center[1], frame.center[2], frame.widthM, frame.heightM, frame.depthM, freeView, size.height, size.width]);

  useFrame((_, delta) => {
    if (freeView) return;

    const t = freeView ? 1 : 1 - Math.exp(-9 * delta);
    panX.current += (frame.center[0] - panX.current) * t;
    const rigFrame = buildRigFrame(frame, panX.current);
    const perspective = camera as PerspectiveCameraImpl;

    const [tx, ty, tz] = rigFrame.target;
    const target = new Vector3(tx, ty, tz);
    const minDistance = frame.minDistance ?? 0.8;
    const maxDistance = frame.maxDistance ?? 6;
    const currentDistance = Math.min(maxDistance, Math.max(minDistance, perspective.position.distanceTo(target)));

    perspective.position.set(tx, ty, tz + currentDistance);
    perspective.lookAt(target);
    perspective.updateProjectionMatrix();
  });

  return null;
}
