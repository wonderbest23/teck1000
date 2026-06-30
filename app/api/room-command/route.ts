import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  ADDABLE_PRODUCT_TYPES,
  DOOR_STYLES,
  MATERIAL_NAMES,
  MATERIAL_LINES,
  PRODUCT_LABEL_LINES,
  type RoomCommandResult,
  type RoomStateSummary,
} from "@/lib/roomCommands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AI가 낼 수 있는 동작은 '지금 구현된 것'으로만 제한 — enum이 곧 화이트리스트다.
const ROOM_TOOL: Anthropic.Tool = {
  name: "apply_room_actions",
  description: "사용자의 자연어 요청을 '내 공간' 편집기에서 실제로 지원하는 동작들로 변환해 제출한다. 지원하지 않는 건 만들지 말 것.",
  input_schema: {
    type: "object",
    properties: {
      reply: { type: "string", description: "사용자에게 보여줄 짧은 한국어 응답(무엇을 했는지). 1~2문장." },
      actions: {
        type: "array",
        description: "순서대로 실행할 동작 목록. 지원하지 않는 요청이면 빈 배열로 두고 reply로 안내.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["add", "modify", "rotate", "remove", "arrange"],
              description: "add=가구 추가, modify=현재 선택된 가구 속성 변경, rotate=선택 가구 90° 회전, remove=선택 가구 삭제, arrange=자동 정렬",
            },
            productType: { type: "string", enum: ADDABLE_PRODUCT_TYPES, description: "add일 때 추가할 상품 종류" },
            material: { type: "string", enum: MATERIAL_NAMES, description: "소재(마감) 이름. add/modify에서 사용" },
            door_style: { type: "string", enum: DOOR_STYLES as unknown as string[], description: "문 디자인. flat=민판, frame=프레임, slat=슬랫" },
            width_mm: { type: "integer", description: "가로(mm)" },
            height_mm: { type: "integer", description: "높이(mm)" },
            depth_mm: { type: "integer", description: "깊이(mm)" },
          },
          required: ["type"],
          additionalProperties: false,
        },
      },
    },
    required: ["reply", "actions"],
    additionalProperties: false,
  },
};

function systemPrompt(state: RoomStateSummary) {
  const itemsText = state.items.length
    ? state.items
        .map((it, i) => `  ${i + 1}. [${it.id}] ${it.name} (${it.productType}) ${it.width_mm}×${it.height_mm}×${it.depth_mm}mm${it.id === state.selectedId ? " ← 현재 선택됨" : ""}`)
        .join("\n")
    : "  (없음)";
  return `당신은 가구 맞춤 3D 편집기 '내 공간'의 어시스턴트다. 사용자의 한국어 요청을 편집기가 실제로 지원하는 동작으로만 변환한다.

[지원하는 동작]
- add: 아래 목록의 상품만 방에 추가. 필요하면 같은 add에서 material/width_mm/height_mm/depth_mm/door_style을 함께 지정.
- modify: '현재 선택된 가구'의 소재/치수/문디자인 변경.
- rotate: 선택 가구 90° 회전.
- remove: 선택 가구 삭제.
- arrange: 전체 자동 정렬.

[추가 가능한 상품(이 외에는 불가)]
${PRODUCT_LABEL_LINES}

[선택 가능한 소재(이 외에는 불가)]
${MATERIAL_LINES}

[문 디자인] flat / frame / slat

[현재 방 상태]
${itemsText}

규칙:
- 위 상품/소재/동작에 없는 것은 절대 만들지 말 것. 모르거나 불가능하면 actions를 비우고 reply로 "지원하지 않는다"고 짧게 안내.
- "싱크대"="kitchen_full_set", "아일랜드"="kitchen_island", "선반"="custom_shelf", "신발장"="shoe_cabinet", "옷장/붙박이"="built_in_wardrobe", "틈새장"="gap_cabinet" 처럼 자연스러운 한국어를 매핑.
- 치수는 mm 정수. "2.4m"=2400. 명시 없으면 기본값을 쓰게 두고 굳이 넣지 말 것.
- modify/rotate/remove는 선택된 가구가 있어야 한다. 없으면 reply로 "먼저 가구를 선택하라"고 안내.
- reply는 항상 한국어 1~2문장.`;
}

export async function POST(request: Request) {
  let body: { message?: string; state?: RoomStateSummary };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  const state: RoomStateSummary = body.state ?? { items: [], selectedId: null };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: systemPrompt(state),
      tools: [ROOM_TOOL],
      tool_choice: { type: "tool", name: "apply_room_actions" },
      messages: [{ role: "user", content: message }],
    });
    const block = response.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return NextResponse.json({ reply: "요청을 이해하지 못했어요. 다시 말씀해 주세요.", actions: [] } satisfies RoomCommandResult);
    }
    const result = block.input as RoomCommandResult;
    return NextResponse.json({ reply: result.reply ?? "", actions: Array.isArray(result.actions) ? result.actions : [] } satisfies RoomCommandResult);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI 처리 중 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
