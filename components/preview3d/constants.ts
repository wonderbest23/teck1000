import { KITCHEN_STANDARDS, getKitchenWallInstallBottomMm } from "@/lib/platformConfig";

export const KITCHEN_WALL_BOTTOM_M = getKitchenWallInstallBottomMm() / 1000;
export const KITCHEN_WALL_HEIGHT_M = KITCHEN_STANDARDS.wallHeightMm / 1000;
export const KITCHEN_WALL_DEPTH_M = KITCHEN_STANDARDS.wallDepthMm / 1000;
export const KITCHEN_BASE_HEIGHT_M = KITCHEN_STANDARDS.baseHeightMm / 1000;
export const KITCHEN_BASE_DEPTH_M = KITCHEN_STANDARDS.baseDepthMm / 1000;
export const KITCHEN_TOE_KICK_M = 0.1;
export const KITCHEN_COUNTERTOP_M = 0.045;
export const KITCHEN_SCENE_HEIGHT_M = KITCHEN_TOE_KICK_M + KITCHEN_WALL_BOTTOM_M + KITCHEN_WALL_HEIGHT_M + 0.08;
export const BOARD_THICKNESS_M = 0.018;
