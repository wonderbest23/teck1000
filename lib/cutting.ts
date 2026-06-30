import {
  type BoardSheetSpec,
  calculateSummarySheetCost,
  getApplicableSheetSpecs,
  getUsableSheetBounds,
} from "@/lib/boardPricing";
import { getCuttingRuntimeConfig } from "@/lib/processStandards";
import type { BoardCutPlan, BoardPlacement, BoardSheetSummary, Part } from "@/lib/types";

type CutPiece = {
  part_name: string;
  piece_number: number;
  width_mm: number;
  height_mm: number;
  material: string;
  color: string;
};

type Row = {
  y: number;
  height: number;
  x: number;
};

type CuttingRuntime = ReturnType<typeof getCuttingRuntimeConfig>;

type SheetState = {
  spec: BoardSheetSpec;
  sheet_number: number;
  material: string;
  color: string;
  rows: Row[];
  placements: BoardPlacement[];
  usable_width_mm: number;
  usable_height_mm: number;
};

export function generateBoardCutPlan(parts: Part[]): BoardCutPlan {
  const runtime = getCuttingRuntimeConfig();
  const pieces = expandParts(parts).sort((a, b) => b.width_mm * b.height_mm - a.width_mm * a.height_mm);
  const grouped = new Map<string, CutPiece[]>();

  for (const piece of pieces) {
    const key = `${piece.material}::${piece.color}`;
    grouped.set(key, [...(grouped.get(key) ?? []), piece]);
  }

  const allSheets: SheetState[] = [];
  let chosenPrimarySpec = getApplicableSheetSpecs(pieces[0]?.material ?? "화이트 PB")[0];

  for (const [, groupPieces] of grouped) {
    const materialName = groupPieces[0]?.material ?? "화이트 PB";
    const specs = getApplicableSheetSpecs(materialName);
    const bestPlan = specs
      .map((spec) => {
        const sheets = packPieces(groupPieces, spec, runtime);
        const summary = summarizeSheets(sheets, spec);
        const cost = summary ? calculateSummarySheetCost(summary) : 0;
        return { spec, sheets, cost };
      })
      .sort((a, b) => a.cost - b.cost || a.sheets.length - b.sheets.length)[0];

    chosenPrimarySpec = bestPlan.spec;
    allSheets.push(...bestPlan.sheets);
  }

  return {
    sheet_width_mm: chosenPrimarySpec.widthMm,
    sheet_height_mm: chosenPrimarySpec.heightMm,
    kerf_mm: runtime.kerfMm,
    factory_code: runtime.factoryCode,
    summaries: summarizeAllSheets(allSheets),
    placements: allSheets.flatMap((sheet) => sheet.placements),
  };
}

/** 문서 기준 유효 절단 영역 (trim 반영) */
export function getUsableSheetSizeMm(spec?: Pick<BoardSheetSpec, "widthMm" | "heightMm">) {
  const runtime = getCuttingRuntimeConfig();
  const widthMm = spec?.widthMm ?? runtime.sheetWidthMm;
  const heightMm = spec?.heightMm ?? runtime.sheetHeightMm;
  return getUsableSheetBounds(
    { widthMm, heightMm },
    { widthMm: runtime.trimWidthMm, lengthMm: runtime.trimLengthMm },
  );
}

function packPieces(pieces: CutPiece[], spec: BoardSheetSpec, runtime: CuttingRuntime): SheetState[] {
  const usable = getUsableSheetBounds(
    spec,
    { widthMm: runtime.trimWidthMm, lengthMm: runtime.trimLengthMm },
  );
  const sheets: SheetState[] = [];

  for (const piece of pieces) {
    const compatibleSheets = sheets.filter((sheet) => sheet.material === piece.material && sheet.color === piece.color);
    let placed = false;

    for (const sheet of compatibleSheets) {
      const placement = tryPlaceOnSheet(sheet, piece, runtime.kerfMm);
      if (placement) {
        sheet.placements.push(placement);
        placed = true;
        break;
      }
    }

    if (!placed) {
      const newSheet: SheetState = {
        spec,
        sheet_number: compatibleSheets.length + 1,
        material: piece.material,
        color: piece.color,
        rows: [],
        placements: [],
        usable_width_mm: usable.width_mm,
        usable_height_mm: usable.height_mm,
      };
      const placement = tryPlaceOnSheet(newSheet, piece, runtime.kerfMm);
      if (placement) {
        newSheet.placements.push(placement);
      } else {
        newSheet.placements.push({
          sheet_number: newSheet.sheet_number,
          part_name: piece.part_name,
          piece_number: piece.piece_number,
          x_mm: 0,
          y_mm: 0,
          width_mm: piece.width_mm,
          height_mm: piece.height_mm,
          rotated: false,
          material: piece.material,
          color: piece.color,
        });
      }
      sheets.push(newSheet);
    }
  }

  return sheets;
}

function expandParts(parts: Part[]): CutPiece[] {
  return parts
    .filter((part) => !["금속 부속", "상판 품목", "설비 품목", "가전 품목", "부속 품목", "상판 제외"].includes(part.material))
    .flatMap((part) =>
      Array.from({ length: part.quantity }, (_, index) => ({
        part_name: part.name,
        piece_number: index + 1,
        width_mm: part.width_mm,
        height_mm: part.height_mm,
        material: part.material,
        color: part.color,
      })),
    );
}

function tryPlaceOnSheet(sheet: SheetState, piece: CutPiece, kerfMm: number): BoardPlacement | null {
  const orientations = getOrientations(piece, sheet.usable_width_mm, sheet.usable_height_mm);

  for (const row of sheet.rows) {
    for (const orientation of orientations) {
      if (orientation.height_mm <= row.height && row.x + orientation.width_mm <= sheet.usable_width_mm) {
        const placement = makePlacement(sheet, piece, row.x, row.y, orientation);
        row.x += orientation.width_mm + kerfMm;
        return placement;
      }
    }
  }

  const nextY = sheet.rows.length ? Math.max(...sheet.rows.map((row) => row.y + row.height + kerfMm)) : 0;
  for (const orientation of orientations) {
    if (orientation.width_mm <= sheet.usable_width_mm && nextY + orientation.height_mm <= sheet.usable_height_mm) {
      sheet.rows.push({ y: nextY, height: orientation.height_mm, x: orientation.width_mm + kerfMm });
      return makePlacement(sheet, piece, 0, nextY, orientation);
    }
  }

  return null;
}

function getOrientations(piece: CutPiece, maxWidthMm: number, maxHeightMm: number) {
  const original = { width_mm: piece.width_mm, height_mm: piece.height_mm, rotated: false };
  const rotated = { width_mm: piece.height_mm, height_mm: piece.width_mm, rotated: true };
  if (piece.width_mm === piece.height_mm) return [original];
  return [original, rotated].filter(
    (orientation) => orientation.width_mm <= maxWidthMm && orientation.height_mm <= maxHeightMm,
  );
}

function makePlacement(
  sheet: SheetState,
  piece: CutPiece,
  x_mm: number,
  y_mm: number,
  orientation: { width_mm: number; height_mm: number; rotated: boolean },
): BoardPlacement {
  return {
    sheet_number: sheet.sheet_number,
    part_name: piece.part_name,
    piece_number: piece.piece_number,
    x_mm,
    y_mm,
    width_mm: orientation.width_mm,
    height_mm: orientation.height_mm,
    rotated: orientation.rotated,
    material: piece.material,
    color: piece.color,
  };
}

function summarizeAllSheets(sheets: SheetState[]): BoardSheetSummary[] {
  const grouped = new Map<string, SheetState[]>();
  for (const sheet of sheets) {
    const key = `${sheet.material}::${sheet.color}::${sheet.spec.code}`;
    grouped.set(key, [...(grouped.get(key) ?? []), sheet]);
  }

  return Array.from(grouped.values()).flatMap((group) => {
    const summary = summarizeSheets(group, group[0].spec);
    return summary ? [summary] : [];
  });
}

function summarizeSheets(sheets: SheetState[], spec: BoardSheetSpec): BoardSheetSummary | null {
  if (sheets.length === 0) return null;
  const usedAreaMm2 = sheets.reduce(
    (sum, sheet) => sum + sheet.placements.reduce((sheetSum, placement) => sheetSum + placement.width_mm * placement.height_mm, 0),
    0,
  );
  const boardAreaMm2 = sheets.length * spec.widthMm * spec.heightMm;
  const usedAreaM2 = usedAreaMm2 / 1_000_000;
  const boardAreaM2 = boardAreaMm2 / 1_000_000;

  return {
    material: sheets[0].material,
    color: sheets[0].color,
    sheet_spec_code: spec.code,
    sheet_width_mm: spec.widthMm,
    sheet_height_mm: spec.heightMm,
    sheet_count: sheets.length,
    used_area_m2: usedAreaM2,
    board_area_m2: boardAreaM2,
    utilization_rate: boardAreaMm2 ? usedAreaMm2 / boardAreaMm2 : 0,
    waste_area_m2: Math.max(boardAreaM2 - usedAreaM2, 0),
  };
}
