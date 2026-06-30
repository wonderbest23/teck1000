"use client";

import { useState } from "react";

const INQUIRY_TEMPLATE = `제목: [플랫폼 DB 등록 요청] 제품 스펙 확인 요청

안녕하세요.
아래 제품을 플랫폼 DB에 등록하려고 하며, 공개 자료에 없는 필드 확인을 요청드립니다.

- 제조사:
- 제품군: 싱크볼 / 수전 / 가전 / 도어 / 엣지 / 철물
- 모델명:
- 공개 확인 출처:
- 요청 필드:
  - 최소 하부장 폭(mm):
  - 컷아웃 CAD/PDF:
  - 배수 중심 좌표(mm):
  - 수전 타공 권장 범위(mm):
  - 수전 호스 길이(mm):
  - 권장 설치거리(mm):
  - 설치설명서 URL/PDF:
  - 환기 여유(mm):
  - 제품 총 두께(mm):
  - 호환 엣지/도어 조합:

미등록 필드는 회신 전까지 플랫폼에서 '제작문의'로 처리됩니다.
감사합니다.`;

export function ManufacturerInquiryForm() {
  const [body, setBody] = useState(INQUIRY_TEMPLATE);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        기준서에 따라 공개 스펙이 없는 항목은 자동 판정하지 않습니다. 제조사에 아래 양식으로 스펙을 요청하세요.
      </p>
      <textarea
        className="min-h-[420px] w-full rounded-2xl border border-slate-200 bg-soft p-4 font-mono text-sm leading-6"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <button type="button" onClick={copy} className="rounded-2xl bg-brand px-5 py-3 text-sm font-black text-white">
        {copied ? "복사됨" : "양식 복사"}
      </button>
    </div>
  );
}
