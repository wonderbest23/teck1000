import { getSinkBowlByOptionId } from "@/lib/interior/masters/sinkBowls";

export type SinkFixtureSpec = {
  widthM: number;
  depthM: number;
  bowlDepthM: number;
  rimHeightM: number;
  hasMaster: boolean;
  modelLabel: string;
};

export function getSinkFixtureSpec(sinkOptionId?: string, cabinetWidthM = 0.9): SinkFixtureSpec {
  const master = getSinkBowlByOptionId(sinkOptionId);
  if (!master) {
    return {
      widthM: Math.min(cabinetWidthM * 0.72, 0.78),
      depthM: 0.34,
      bowlDepthM: 0.12,
      rimHeightM: 0.018,
      hasMaster: false,
      modelLabel: "기본",
    };
  }

  const cutoutW = master.cutout_w_mm ?? master.overall_w_mm ?? master.bowl_w_mm ?? 780;
  const cutoutD = master.cutout_d_mm ?? master.overall_d_mm ?? master.bowl_d_mm ?? 450;
  const bowlH = master.overall_h_mm ?? 200;

  return {
    widthM: Math.min(cutoutW / 1000, cabinetWidthM * 0.92),
    depthM: cutoutD / 1000,
    bowlDepthM: Math.min(bowlH / 1000, 0.22),
    rimHeightM: 0.018,
    hasMaster: true,
    modelLabel: master.model_code,
  };
}
