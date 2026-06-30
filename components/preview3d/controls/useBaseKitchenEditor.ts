"use client";

import { useCallback } from "react";
import { getCountertopOption, getFaucetOption, getSinkOption, getToeKickOption } from "@/lib/kitchen";
import { getDoorCountOptions } from "@/lib/rules";
import type { FurnitureInput } from "@/lib/types";

export function useBaseKitchenEditor(input: FurnitureInput, onInputChange?: (input: FurnitureInput) => void) {
  const enabled = Boolean(onInputChange) && input.productType === "kitchen_base_cabinet";

  const patch = useCallback(
    (partial: Partial<FurnitureInput>) => {
      if (!onInputChange) return;
      onInputChange({ ...input, ...partial });
    },
    [input, onInputChange],
  );

  const countertop = getCountertopOption(input.countertop_type);
  const sink = getSinkOption(input.sink_option);
  const faucet = getFaucetOption(input.faucet_option);
  const toeKick = getToeKickOption(input.toe_kick_option);
  const doorOptions = getDoorCountOptions(input.productType, input.width_mm, input.has_door);

  const toggleCountertop = useCallback(() => {
    patch({ countertop_type: countertop.id === "none" ? "pt_white" : "none" });
  }, [countertop.id, patch]);

  const toggleSink = useCallback(() => {
    const nextSink = sink.id === "none" ? "single_780" : "none";
    patch({
      sink_option: nextSink,
      faucet_option: nextSink === "none" ? "none" : faucet.id === "none" ? "basic_cobra" : faucet.id,
    });
  }, [faucet.id, patch, sink.id]);

  const toggleToeKick = useCallback(() => {
    patch({ toe_kick_option: toeKick.id === "none" ? "standard_100" : "none" });
  }, [patch, toeKick.id]);

  const changeDoorCount = useCallback(
    (delta: number) => {
      if (doorOptions.length === 0) return;
      const currentIndex = doorOptions.indexOf(input.door_count);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = Math.min(Math.max(safeIndex + delta, 0), doorOptions.length - 1);
      patch({ has_door: true, door_count: doorOptions[nextIndex] });
    },
    [doorOptions, input.door_count, patch],
  );

  return {
    enabled,
    hasCountertop: countertop.id !== "none",
    hasSink: sink.id !== "none",
    hasToeKick: toeKick.id !== "none",
    doorCount: input.door_count,
    doorOptions,
    toggleCountertop,
    toggleSink,
    toggleToeKick,
    changeDoorCount,
  };
}
