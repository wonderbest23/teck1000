import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { productFromPrice, productLabels } from "@/lib/catalog";
import type { ProductType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_LINES = (Object.keys(productLabels) as ProductType[])
  .map((p) => {
    const price = productFromPrice[p];
    return `- ${productLabels[p]}${price ? ` (예상 시작가 ${price.toLocaleString()}원~)` : ""}`;
  })
  .join("\n");

const SYSTEM = `당신은 맞춤 가구 제작 플랫폼 '동방씽크'의 상담 어시스턴트입니다. 고객의 문의에 한국어로 친절하고 간결하게(보통 2~4문장) 답합니다.

[안내 가능한 상품]
${PRODUCT_LINES}

[제작 흐름]
1) 공간 선택 → 2) 사이즈 입력 → 3) 자재(소재·문) 선택 → 4) 3D 미리보기로 확인 후 즉시 견적. 모든 상품은 '제작 시작하기'에서 10초 만에 3D로 미리보고 견적을 받을 수 있습니다.

[서비스]
- 맞춤 제작: 폭/높이/깊이·소재·문 디자인·모듈(칸) 구성을 고객 공간에 맞춰 제작.
- 무료 실측 상담: 전문가가 정확한 사이즈를 도와드립니다.
- 자재: UV 하이그로시(화이트·그레이·차콜), 무광 화이트(슈퍼매트), LPM 무늬목(라이트오크·내추럴오크·월넛·자작) 등.

[규칙]
- 위 상품·서비스 범위에서만 안내하세요. 정확한 견적은 사이즈/구성에 따라 달라지므로 "3D 미리보기에서 즉시 견적 확인"을 권하세요.
- 배송/설치 일정, 정확한 금액 확정, 복잡한 현장 건은 "전화상담(아래 전화상담 버튼)"이나 "무료 실측 상담"을 권하세요.
- 모르는 정보는 지어내지 말고 전화상담을 안내하세요.`;

export async function POST(request: Request) {
  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim());
  if (!messages.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 600,
      system: SYSTEM,
      messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({ reply: reply || "죄송해요, 다시 한 번 말씀해 주세요." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "AI 처리 중 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
