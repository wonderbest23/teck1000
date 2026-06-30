# 인테리어 플랫폼 기준서

데이터 검증·제작 파이프라인 설계 기준서(PDF)에 따른 운영 문서 구조입니다.

## 카탈로그
- [boards.md](./catalog/boards.md) — 원판/보드/표면재/친환경등급
- [modules-kitchen.md](./catalog/modules-kitchen.md) — 싱크대 상하부장/키큰장/가전장
- [sinks-faucets-appliances.md](./catalog/sinks-faucets-appliances.md) — 싱크볼/수전/가전 스펙

## 검증·파이프라인
- [validation-engine.md](./rules/validation-engine.md) — 5단계 검증식
- [bom-template.md](./bom/bom-template.md) — 견적/BOM 포맷
- [cut-plan-template.md](./bom/cut-plan-template.md) — 재단지시서/CNC 체계

## 운영
- [exception-tree.md](./site-check/exception-tree.md) — 현장확인·제작문의 분기
- [source-register.md](./references/source-register.md) — 출처 원장

## 코드 매핑
| 기준서 항목 | 구현 경로 |
|------------|----------|
| 5단계 검증 | `lib/interior/pipeline/` |
| BOM/재단 출력 | `lib/interior/bomPipeline.ts` |
| 보드·가전·공장 마스터 | `lib/interior/masters/` |
| Preview API | `POST /api/v1/preview` |
| DB 스키마 | `supabase/migrations/0006_pipeline_schema.sql` |
| 검증 스크립트 | `scripts/test-pipeline-standard.mjs` |
| **3D 미리보기 (AI 개선용)** | **`docs/PREVIEW_3D_IMPLEMENTATION.md`** |

## 절대 규칙
> 자동 제작 가능 = 공개 표준·제조사 스펙 확정값 + 공장 프로파일 등록 + 현장 좌표 검증

미등록 필드(`saw_kerf_mm`, `drain_center`, `edge_thickness_mm` 등)는 추정값으로 채우지 않습니다.
