import { NextResponse } from "next/server";
import { buildBomLines, buildCutPlanLines } from "@/lib/interior/bomPipeline";
import { calculateQuote } from "@/lib/quote";
import { validatePreviewRequest } from "@/lib/interior/validatePreview";
import type { PreviewRequest } from "@/lib/interior/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PreviewRequest;
    if (!body.input) {
      return NextResponse.json({ verdict: "제작문의", issues: [], can_submit: false, error: "input 필수" }, { status: 400 });
    }

    const { pipeline, ...verdictResult } = validatePreviewRequest(body);
    const quote = calculateQuote(body.input);

    const bom_lines = buildBomLines({
      productType: body.input.productType,
      sink_option: body.input.sink_option,
      appliances: body.appliances,
      plant_id: body.plant_id,
      sheet_count: quote.sheetCount,
    });

    const cut_plan = buildCutPlanLines(quote.parts, body.input.productType, body.plant_id);

    return NextResponse.json({
      verdict: verdictResult.verdict,
      issues: verdictResult.issues,
      can_submit: verdictResult.canSubmitOrder,
      order_ready: verdictResult.canSubmitOrder && verdictResult.verdict === "가능",
      quote_preview: {
        final_price: quote.finalPrice,
        sheet_count: quote.sheetCount,
        margin_rate: quote.marginRate,
      },
      bom_summary: {
        sheet_count: quote.sheetCount,
        part_count: quote.parts.reduce((sum, p) => sum + p.quantity, 0),
        edge_length_m: quote.edgeLengthM,
      },
      bom_lines,
      cut_plan,
      pipeline_stages: pipeline.stages.map((stage) => ({
        stage: stage.stage,
        stage_label: stage.stage_label,
        verdict: stage.verdict,
        issue_count: stage.issues.length,
      })),
      validation_log: verdictResult.issues,
    });
  } catch (error) {
    return NextResponse.json(
      { verdict: "제작문의", issues: [], can_submit: false, error: error instanceof Error ? error.message : "preview 실패" },
      { status: 400 },
    );
  }
}
