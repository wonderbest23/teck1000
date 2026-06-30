"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { applyOrthoFrame } from "@/components/preview3d/camera/fitCamera";
import type { SceneFrame } from "@/components/preview3d/types";
import type { OrthographicCamera as OrthographicCameraImpl } from "three";

export function SmoothFrontCameraRig({ frame }: { frame: SceneFrame }) {
  const { camera, size } = useThree();
  const panX = useRef(frame.center[0]);

  useLayoutEffect(() => {
    panX.current = frame.center[0];
    applyOrthoFrame(camera as OrthographicCameraImpl, frame, size);
  }, [camera, frame, size.height, size.width]);

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-9 * delta);
    panX.current += (frame.center[0] - panX.current) * t;

    applyOrthoFrame(
      camera as OrthographicCameraImpl,
      {
        ...frame,
        center: [panX.current, frame.center[1], 0],
        target: [panX.current, frame.target[1], 0],
      },
      size,
    );
  }, 1);

  return null;
}
