import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 사진에서 추출할 주방 초안 구조 (KitchenPhotoStudio의 PhotoDraft와 호환)
const LAYOUT_TOOL: Anthropic.Tool = {
  name: "submit_kitchen_layout",
  description: "사진에서 분석한 주방 싱크대 구성을 구조화된 값으로 제출한다.",
  input_schema: {
    type: "object",
    properties: {
      layoutShape: { type: "string", enum: ["straight", "l_shape"], description: "주방 배치 모양. 일자면 straight, ㄱ자(L자)면 l_shape." },
      totalWidthMm: { type: "integer", description: "메인(긴) 런의 전체 가로 길이(mm). 1200~4200. 도면에 적힌 숫자가 있으면 그 숫자를 그대로 사용." },
      moduleCount: { type: "integer", description: "메인 런 하부장 칸(모듈) 개수. 2~7." },
      moduleTypes: {
        type: "array",
        description: "메인 런 각 칸의 종류를 왼쪽부터 순서대로. 길이는 moduleCount와 같아야 함.",
        items: { type: "string", enum: ["door", "drawer", "sink_base", "cooktop", "open"] },
      },
      cornerSide: { type: "string", enum: ["left", "right"], description: "l_shape일 때 측면(꺾인) 다리가 메인 런의 어느 쪽 끝에 붙는지. straight면 right로 둠." },
      sideTotalWidthMm: { type: "integer", description: "l_shape일 때 측면(꺾인) 다리의 전체 길이(mm). straight면 0. 도면에 적힌 숫자 우선." },
      sideModuleCount: { type: "integer", description: "l_shape일 때 측면 다리 하부장 칸 수. straight면 0." },
      sideModuleTypes: {
        type: "array",
        description: "l_shape일 때 측면 다리 각 칸 종류(코너에서 바깥쪽 순서). straight면 빈 배열.",
        items: { type: "string", enum: ["door", "drawer", "sink_base", "cooktop", "open"] },
      },
      hasWall: { type: "boolean", description: "상부장/벽장이 보이면 true." },
      hasSink: { type: "boolean", description: "싱크볼이 보이면 true." },
      sinkIndex: { type: "integer", description: "싱크볼이 위치한 메인 런 칸 인덱스(0부터). 없으면 0." },
      hasCooktop: { type: "boolean", description: "쿡탑/가스레인지가 보이면 true." },
      cooktopIndex: { type: "integer", description: "쿡탑이 위치한 메인 런 칸 인덱스(0부터). 없으면 0." },
      hasHood: { type: "boolean", description: "후드가 보이면 true." },
      hoodIndex: { type: "integer", description: "후드가 위치한 메인 런 칸 인덱스(0부터). 보통 쿡탑과 동일." },
      note: { type: "string", description: "도면에서 읽은 치수, 추정 근거, 현장 실측 필요 여부 등 한 줄 메모." },
    },
    required: [
      "layoutShape",
      "totalWidthMm",
      "moduleCount",
      "moduleTypes",
      "cornerSide",
      "sideTotalWidthMm",
      "sideModuleCount",
      "sideModuleTypes",
      "hasWall",
      "hasSink",
      "sinkIndex",
      "hasCooktop",
      "cooktopIndex",
      "hasHood",
      "hoodIndex",
      "note",
    ],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `너는 주방 가구 제작 견적을 위한 비전 분석 도우미다.
업로드된 주방/싱크대 사진(또는 손그림, 기존 싱크대 사진)을 보고, 제작에 필요한 싱크대 구성을 추정한다.

추정 규칙:
- 가장 먼저 배치 모양을 판단한다. 싱크대가 직선 한 줄이면 layoutShape="straight", ㄱ자/L자처럼 한쪽 끝에서 직각으로 꺾여 있으면 layoutShape="l_shape"다. (도면이나 사진에서 ㄱ 모양, 모서리에서 꺾인 선, 두 방향의 캐비닛 줄이 보이면 l_shape)
- ★도면(손그림 포함)에 숫자 치수가 적혀 있으면 절대 눈대중으로 바꾸지 말고 적힌 숫자를 그대로 mm로 사용한다. (예: 1650, 940, 788, 330 등) 여러 칸 치수가 적혀 있으면 합이 totalWidthMm가 되도록 한다.
- l_shape인 경우: 더 긴 줄을 메인 런(totalWidthMm, moduleCount, moduleTypes)으로, 꺾여 나간 짧은 줄을 측면 다리(sideTotalWidthMm, sideModuleCount, sideModuleTypes)로 나눈다. cornerSide는 측면 다리가 메인 런의 왼쪽 끝이면 left, 오른쪽 끝이면 right.
- straight인 경우: sideTotalWidthMm=0, sideModuleCount=0, sideModuleTypes=[], cornerSide="right".
- 숫자 치수가 전혀 없을 때만 한 칸 600mm 안팎으로 추정한다. 칸 종류는 왼쪽→오른쪽 순서로 담고 길이는 칸 수와 정확히 같아야 한다.
- 싱크볼 칸은 "sink_base", 쿡탑/레인지 칸은 "cooktop"으로 표기한다.
- ★★설비는 도면/사진에 실제로 그려져 있거나 글자로 적혀 있을 때만 추가한다. 절대로 임의로 넣지 마라.
  · 싱크볼 모양(타원/사각 볼)이나 "싱크/개수대" 글자가 없으면 hasSink=false.
  · 수전(수도꼭지) 표시나 "수전/수도" 글자가 없으면 hasFaucet=false. (싱크가 있어도 수전 표시가 없으면 false)
  · 가스레인지/쿡탑/인덕션 표시나 글자가 없으면 hasCooktop=false.
  · 후드 표시나 "후드" 글자가 없으면 hasHood=false.
  애매하면 무조건 false로 둔다. 빈 칸(문/서랍)만 있는 도면이면 설비는 모두 false다.
- note에는 도면에서 읽은 숫자와 추정/실측 필요 여부를 한국어로 적는다.
- 반드시 submit_kitchen_layout 도구를 호출해 결과를 제출한다. 일반 텍스트로 답하지 마라.`;

type LearnExample = { ai?: unknown; fixed?: unknown; note?: string; thumb?: string };

/**
 * 누적 보정 예시를 few-shot 콘텐츠 블록으로 변환 (최근 8건).
 * 썸네일이 있는 최근 3건은 실제 사진 + 정답을 멀티모달 예시로 포함해 손글씨 자체를 학습시킨다.
 */
function buildLearningContent(examples: LearnExample[]): Anthropic.ContentBlockParam[] {
  const recent = examples.slice(-8);
  if (!recent.length) return [];
  const blocks: Anthropic.ContentBlockParam[] = [
    {
      type: "text",
      text: [
        "아래는 이 작업장에서 사람이 직접 보정한 과거 예시다(AI 추정 → 사람이 고친 정답). 일부는 실제 사진을 포함한다.",
        "같은 손글씨·표기 습관과 규칙을 이번 사진 분석에도 동일하게 적용하라.",
        "특히 반복되는 차이(모듈 폭/칸 수, ㄱ자 코너 방향, 설비 유무, 위치 인덱스)를 학습해 같은 실수를 반복하지 마라.",
      ].join("\n"),
    },
  ];
  const imaged = new Set(recent.filter((ex) => typeof ex.thumb === "string").slice(-3));
  recent.forEach((ex, index) => {
    const note = ex.note ? ` (메모: ${ex.note})` : "";
    if (imaged.has(ex) && typeof ex.thumb === "string") {
      blocks.push({ type: "text", text: `예시 ${index + 1}) 아래 사진의 실제 정답은:` });
      blocks.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: ex.thumb.replace(/^data:[^;]+;base64,/, "") } });
      blocks.push({ type: "text", text: `→ ${JSON.stringify(ex.fixed)}${note}` });
    } else {
      blocks.push({ type: "text", text: `예시 ${index + 1}) AI추정=${JSON.stringify(ex.ai)} → 실제정답=${JSON.stringify(ex.fixed)}${note}` });
    }
  });
  return blocks;
}

export async function POST(request: Request) {
  let body: { imageBase64?: string; mediaType?: string; note?: string; apiKey?: string; examples?: LearnExample[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 화면에서 입력한 키를 우선 사용, 없으면 서버 환경변수(.env.local) 사용
  const apiKey =
    body.apiKey?.trim() || request.headers.get("x-anthropic-key")?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API 키가 없습니다. 화면의 키 입력란에 넣거나 .env.local에 ANTHROPIC_API_KEY를 설정하세요." },
      { status: 501 },
    );
  }

  const imageBase64 = (body.imageBase64 ?? "").replace(/^data:[^;]+;base64,/, "");
  const mediaType = (body.mediaType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  if (!imageBase64) {
    return NextResponse.json({ error: "분석할 사진(imageBase64)이 필요합니다." }, { status: 400 });
  }

  const learningBlocks = buildLearningContent(Array.isArray(body.examples) ? body.examples : []);

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      // 안정적인 prefix(도구 정의 + 시스템)를 캐시 → 반복 호출 비용 절감
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [LAYOUT_TOOL],
      tool_choice: { type: "tool", name: "submit_kitchen_layout" },
      messages: [
        {
          role: "user",
          content: [
            ...learningBlocks,
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text: body.note?.trim()
                ? `참고 메모: ${body.note.trim()}\n이 주방 사진을 분석해 싱크대 구성을 제출해줘.`
                : "이 주방 사진을 분석해 싱크대 구성을 제출해줘.",
            },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "사진에서 구성을 추출하지 못했습니다. 다른 사진으로 시도해주세요." }, { status: 422 });
    }

    return NextResponse.json({ draft: toolUse.input });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY가 유효하지 않습니다." }, { status: 401 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI 분석 오류(${error.status ?? ""}): ${error.message}` }, { status: 502 });
    }
    return NextResponse.json({ error: "AI 분석 중 알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}
