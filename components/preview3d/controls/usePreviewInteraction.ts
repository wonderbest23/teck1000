"use client";

import { useEffect, useState } from "react";
import { TOUCH } from "three";

export function usePreviewInteraction({
  isDragging,
  isEditing,
  freeView,
}: {
  isDragging: boolean;
  isEditing: boolean;
  freeView: boolean;
}) {
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const orbitBlocked = isDragging || isEditing;
  const orbitEnabled = freeView && !orbitBlocked;

  const touches = coarsePointer
    ? { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }
    : undefined;

  return { orbitEnabled, coarsePointer, touches };
}
