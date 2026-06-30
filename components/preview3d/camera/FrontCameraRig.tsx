"use client";

import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { applyOrthoFrame } from "@/components/preview3d/camera/fitCamera";
import type { SceneFrame } from "@/components/preview3d/types";
import type { OrthographicCamera as OrthographicCameraImpl } from "three";

export function FrontCameraRig({ frame }: { frame: SceneFrame }) {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    applyOrthoFrame(camera as OrthographicCameraImpl, frame, size);
  }, [camera, frame, size.height, size.width]);

  return null;
}
