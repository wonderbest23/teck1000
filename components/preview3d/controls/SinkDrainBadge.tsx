"use client";

import { getSinkOption } from "@/lib/kitchen";
import type { FurnitureInput } from "@/lib/types";

export function shouldShowDrainBadge(input: FurnitureInput) {
  const sinkEnabled = getSinkOption(input.sink_option).id !== "none";
  const sinkModule = input.kitchen_module_types?.includes("sink_base");
  if (input.productType === "kitchen_full_set") return sinkEnabled || Boolean(sinkModule);
  if (input.productType === "kitchen_base_cabinet") return sinkEnabled || input.kitchen_module_types?.[0] === "sink_base";
  return false;
}

export function SinkDrainBadge({ input }: { input: FurnitureInput }) {
  if (!shouldShowDrainBadge(input)) return null;

  return (
    <div className="pointer-events-none absolute bottom-9 left-2 z-20 rounded-full border border-amber-200/80 bg-amber-50/65 px-2 py-0.5 text-[9px] font-black text-amber-900 backdrop-blur-sm">
      배수 미지정
    </div>
  );
}
