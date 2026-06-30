import { generateManufacturingJob } from "@/lib/manufacturing";
import { BOARD_SHEET_SPECS } from "@/lib/boardPricing";
import { getCuttingRuntimeConfig } from "@/lib/processStandards";
import type { BoardCutPlan, BoardPlacement, BoardSheetSummary, Order } from "@/lib/types";

export function ManufacturingTabs({ order }: { order: Order }) {
  const job = generateManufacturingJob(order);

  return (
    <div className="space-y-6 print:text-black">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand">제작지시서</p>
            <h1 className="mt-2 text-3xl font-black text-ink">{order.order_number}</h1>
            <p className="mt-2 text-slate-600">{order.product_name} / {order.input.width_mm} x {order.input.height_mm} x {order.input.depth_mm}mm</p>
            <p className="mt-1 text-sm text-slate-500">
              {job.factory_label} · {job.pricing_tier_label} · kerf {job.boardCutPlan.kerf_mm}mm
            </p>
          </div>
          <button className="rounded-2xl border border-slate-300 px-5 py-3 font-bold print:hidden" onClick={undefined}>인쇄하기</button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-ink">원판 소요량</h2>
            <p className="mt-1 text-sm text-slate-500">
              기준 원판 {job.boardCutPlan.sheet_width_mm} x {job.boardCutPlan.sheet_height_mm}mm / 톱날 여유 {job.boardCutPlan.kerf_mm}mm
            </p>
          </div>
          <div className="rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white">
            총 {job.boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0)}장
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {job.boardCutPlan.summaries.map((summary) => (
            <div key={`${summary.material}-${summary.color}-${summary.sheet_spec_code}`} className="rounded-2xl bg-soft p-4">
              <div className="text-sm font-bold text-slate-500">{summary.material} / {summary.color}</div>
              <div className="mt-1 text-xs text-slate-500">{summary.sheet_spec_code} · {summary.sheet_width_mm}×{summary.sheet_height_mm}mm · {getSheetThicknessLabel(summary)}</div>
              <div className="mt-2 text-3xl font-black text-brand">{summary.sheet_count}장</div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                사용 {summary.used_area_m2.toFixed(2)}m2 / 원판 {summary.board_area_m2.toFixed(2)}m2<br />
                사용률 {(summary.utilization_rate * 100).toFixed(1)}% / 잔량 {summary.waste_area_m2.toFixed(2)}m2
              </div>
            </div>
          ))}
        </div>
      </section>

      <BoardCutDrawing boardCutPlan={job.boardCutPlan} />

      <CncTwoPassGuide parts={job.parts} />

      <CncCutInputTable parts={job.parts} />

      <CncBeginnerGuide />

      <CncWorkGuide />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
        <h2 className="text-2xl font-black text-ink">재단 공정 순서</h2>
        <p className="mt-1 text-sm text-slate-500">공장 프로필 기준 cut_sequence — 포장: {job.packing_rule}</p>
        <ol className="mt-4 space-y-3">
          {job.cutSequence.map((step) => (
            <li key={step.step_code} className="flex gap-4 rounded-2xl bg-soft p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">
                {step.order}
              </div>
              <div>
                <div className="font-black text-ink">{step.step_label}</div>
                <div className="mt-1 text-sm text-slate-600">{step.description}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <FactoryTable
        title="원판별 재단 배치"
        headers={["원판", "부품명", "개체", "X", "Y", "가로mm", "세로mm", "회전", "자재", "색상"]}
        rows={job.boardCutPlan.placements.map((placement) => [
          placement.sheet_number,
          placement.part_name,
          placement.piece_number,
          placement.x_mm,
          placement.y_mm,
          placement.width_mm,
          placement.height_mm,
          placement.rotated ? "90도" : "-",
          placement.material,
          placement.color,
        ])}
      />

      <FactoryTable title="재단 리스트" headers={["번호", "부품명", "가로mm", "세로mm", "수량", "자재", "색상", "비고"]} rows={job.parts.map((part, index) => [index + 1, part.name, part.width_mm, part.height_mm, part.quantity, part.material, part.color, part.note ?? "-"])} />
      <FactoryTable title="엣지 리스트" headers={["부품명", "앞", "뒤", "좌", "우", "엣지 길이 합계", "비고"]} rows={job.edgeTasks.map((task) => [task.part_name, yn(task.front_edge), yn(task.back_edge), yn(task.left_edge), yn(task.right_edge), `${task.total_edge_length_mm}mm`, task.note ?? "-"])} />
      <FactoryTable title="부속 리스트" headers={["부속명", "규격", "수량", "단위", "비고"]} rows={job.hardwareTasks.map((task) => [task.hardware_name, task.spec, task.quantity, task.unit, task.note ?? "-"])} />
      <section className="grid gap-4 md:grid-cols-2">
        {job.packingLabels.map((label) => (
          <div key={label.box_number} className="rounded-3xl border-2 border-slate-900 bg-white p-6 text-xl leading-9">
            <div className="font-black">주문번호: {order.order_number}</div>
            <div>상품명: {order.product_name}</div>
            <div>고객명: {order.customer_name}</div>
            <div>박스: {label.box_number} / {label.total_boxes}</div>
            <div>구성품: {label.items}</div>
            <div className="font-black">주의: {label.caution}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function BoardCutDrawing({ boardCutPlan }: { boardCutPlan: BoardCutPlan }) {
  const totalSheets = boardCutPlan.summaries.reduce((sum, summary) => sum + summary.sheet_count, 0);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">원판 재단 도면</h2>
          <p className="mt-1 text-sm text-slate-500">
            원판 {totalSheets}장 · trim/kerf 반영 배치 · 좌표는 좌상단 기준 mm
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
          {boardCutPlan.summaries.map((summary) => `${summary.material} ${summary.sheet_count}장`).join(" / ")}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {boardCutPlan.summaries.flatMap((summary) =>
          Array.from({ length: summary.sheet_count }, (_, sheetIndex) => (
            <SheetDrawing
              key={`${summary.material}-${summary.color}-${summary.sheet_spec_code}-${sheetIndex + 1}`}
              summary={summary}
              sheetNumber={sheetIndex + 1}
              placements={boardCutPlan.placements.filter(
                (placement) =>
                  placement.material === summary.material &&
                  placement.color === summary.color &&
                  placement.sheet_number === sheetIndex + 1,
              )}
            />
          )),
        )}
      </div>
    </section>
  );
}

type CncCutRow = {
  cutLengthMm: number;
  count: number;
  partNames: string[];
};

type CncCutGroup = {
  material: string;
  color: string;
  stockWidthMm: number;
  rows: CncCutRow[];
};

type CncStripGroup = {
  material: string;
  color: string;
  stripWidthMm: number;
  stripCount: number;
  usedLengthsMm: number[];
};

function CncTwoPassGuide({ parts }: { parts: Order["quote"]["parts"] }) {
  const stripGroups = buildCncStripGroups(parts);
  const cutting = getCuttingRuntimeConfig();
  const usableWidthMm = cutting.sheetWidthMm - cutting.trimWidthMm * 2;
  const usableLengthMm = cutting.sheetHeightMm - cutting.trimLengthMm * 2;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">2단계 재단 방식</h2>
          <p className="mt-1 text-sm text-slate-500">
            어머니 방식 기준: 먼저 원판을 필요한 폭의 긴 띠로 자르고, 띠를 돌려 최종 길이를 자릅니다.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
          1차 띠재단 → 2차 길이재단
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl bg-soft p-4">
          <div className="text-sm font-black text-ink">작업 이해</div>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li><b>테두리:</b> 원판 1220×2440에서 사방 10mm 정리 후 실제 사용 가능 치수는 {usableWidthMm}×{usableLengthMm}mm입니다.</li>
            <li><b>톱날:</b> 절단 1번마다 {cutting.kerfMm}mm가 사라집니다.</li>
            <li><b>1차:</b> 톱날이 가로 방향으로 왕복 절단하면서 필요한 폭만큼 긴 띠를 만듭니다.</li>
            <li><b>회전:</b> 잘린 띠를 돌려서 기계의 소재 폭에 맞춥니다.</li>
            <li><b>2차:</b> 돌려 넣은 띠를 세로 방향으로 왕복 절단해 최종 부품을 만듭니다.</li>
            <li><b>검수:</b> 첫 부품 치수 확인 후 같은 폭 작업을 계속합니다.</li>
          </ol>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="bg-slate-950 px-4 py-3 text-sm font-black text-white">1차 띠재단표</div>
          <div className="overflow-x-auto">
            <table className="factory-table">
              <thead>
                <tr>
                  <th>자재</th>
                  <th>띠 폭</th>
                  <th>필요 띠 수</th>
                  <th>2차 절단길이</th>
                </tr>
              </thead>
              <tbody>
                {stripGroups.map((group) => (
                  <tr key={`${group.material}-${group.color}-${group.stripWidthMm}`}>
                    <td>{group.material} / {group.color}</td>
                    <td>{group.stripWidthMm}mm</td>
                    <td>{group.stripCount}</td>
                    <td>{Array.from(new Set(group.usedLengthsMm)).sort((a, b) => b - a).slice(0, 6).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function CncCutInputTable({ parts }: { parts: Order["quote"]["parts"] }) {
  const groups = buildCncCutGroups(parts);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">SE-7100K 정재단 입력표</h2>
          <p className="mt-1 text-sm text-slate-500">
            2차 길이재단 기준: 1차로 만든 띠를 돌린 뒤 소재 폭을 선택하고 절단길이와 횟수를 그대로 입력합니다.
          </p>
        </div>
        <div className="rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white">
          소재 폭 {groups.length}종
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={`${group.material}-${group.color}-${group.stockWidthMm}`} className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950 px-4 py-3 text-white">
              <div className="text-sm font-black">{group.material} / {group.color}</div>
              <div className="rounded-lg bg-white px-3 py-1 text-sm font-black text-slate-950">소재 폭 {group.stockWidthMm}mm</div>
            </div>
            <div className="overflow-x-auto">
              <table className="factory-table">
                <thead>
                  <tr>
                    <th>번호</th>
                    <th>절단길이</th>
                    <th>횟수</th>
                    <th>부품</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, index) => (
                    <tr key={`${group.stockWidthMm}-${row.cutLengthMm}`}>
                      <td>{index + 1}</td>
                      <td>{row.cutLengthMm.toFixed(2)}</td>
                      <td>{row.count}</td>
                      <td>{row.partNames.slice(0, 4).join(", ")}{row.partNames.length > 4 ? ` 외 ${row.partNames.length - 4}` : ""}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 5 - group.rows.length) }, (_, index) => (
                    <tr key={`blank-${group.stockWidthMm}-${index}`}>
                      <td>{group.rows.length + index + 1}</td>
                      <td>0.00</td>
                      <td>0</td>
                      <td>-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildCncCutGroups(parts: Order["quote"]["parts"]): CncCutGroup[] {
  const excludedMaterials = new Set(["금속 부속", "상판 품목", "설비 품목", "가전 품목", "부속 품목", "상판 제외"]);
  const grouped = new Map<string, CncCutGroup>();

  for (const part of parts) {
    if (part.quantity <= 0 || excludedMaterials.has(part.material)) continue;
    const stockWidthMm = Math.round(part.height_mm);
    const cutLengthMm = Math.round(part.width_mm);
    const key = `${part.material}::${part.color}::${stockWidthMm}`;
    const group = grouped.get(key) ?? {
      material: part.material,
      color: part.color,
      stockWidthMm,
      rows: [],
    };
    const existing = group.rows.find((row) => row.cutLengthMm === cutLengthMm);
    if (existing) {
      existing.count += part.quantity;
      existing.partNames.push(part.name);
    } else {
      group.rows.push({ cutLengthMm, count: part.quantity, partNames: [part.name] });
    }
    grouped.set(key, group);
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => b.cutLengthMm - a.cutLengthMm),
    }))
    .sort((a, b) => a.material.localeCompare(b.material, "ko") || b.stockWidthMm - a.stockWidthMm);
}

function buildCncStripGroups(parts: Order["quote"]["parts"]): CncStripGroup[] {
  const excludedMaterials = new Set(["금속 부속", "상판 품목", "설비 품목", "가전 품목", "부속 품목", "상판 제외"]);
  const cutting = getCuttingRuntimeConfig();
  const maxStripLengthMm = cutting.sheetHeightMm - cutting.trimLengthMm * 2;
  const kerfMm = cutting.kerfMm;
  const grouped = new Map<string, { material: string; color: string; stripWidthMm: number; lengths: number[] }>();

  for (const part of parts) {
    if (part.quantity <= 0 || excludedMaterials.has(part.material)) continue;
    const stripWidthMm = Math.round(part.height_mm);
    const cutLengthMm = Math.round(part.width_mm);
    const key = `${part.material}::${part.color}::${stripWidthMm}`;
    const group = grouped.get(key) ?? { material: part.material, color: part.color, stripWidthMm, lengths: [] };
    for (let index = 0; index < part.quantity; index += 1) {
      group.lengths.push(cutLengthMm);
    }
    grouped.set(key, group);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const strips: number[] = [];
      const lengths = [...group.lengths].sort((a, b) => b - a);
      for (const length of lengths) {
        let placed = false;
        for (let index = 0; index < strips.length; index += 1) {
          const nextUsed = strips[index] + kerfMm + length;
          if (nextUsed <= maxStripLengthMm) {
            strips[index] = nextUsed;
            placed = true;
            break;
          }
        }
        if (!placed) strips.push(length);
      }
      return {
        material: group.material,
        color: group.color,
        stripWidthMm: group.stripWidthMm,
        stripCount: strips.length,
        usedLengthsMm: group.lengths,
      };
    })
    .sort((a, b) => a.material.localeCompare(b.material, "ko") || b.stripWidthMm - a.stripWidthMm);
}

function CncBeginnerGuide() {
  const rows = [
    ["1", "주문번호 확인", "제작지시서 상단 주문번호와 라벨지를 맞춥니다."],
    ["2", "자재 올리기", "표에 적힌 자재/색상 합판 1장을 올리고 기준면을 맞춥니다."],
    ["3", "정재단 선택", "기계 왼쪽 메뉴에서 정재단 화면인지 확인합니다."],
    ["4", "소재 폭 선택", "입력표의 소재 폭과 같은 폭 버튼을 누릅니다. 예: 폭 800, 폭1200, 폭2400"],
    ["5", "절단길이 입력", "입력표 1번 줄의 절단길이를 기계 1번 줄 절단길이에 입력합니다."],
    ["6", "횟수 입력", "같은 줄의 횟수를 기계 횟수 칸에 입력합니다."],
    ["7", "다음 줄 반복", "2번, 3번 줄도 절단길이와 횟수를 그대로 입력합니다. 빈 줄은 0으로 둡니다."],
    ["8", "작업 전 복창", "작업자가 소재 폭, 1번 길이/횟수, 2번 길이/횟수를 소리 내어 확인합니다."],
    ["9", "작업시작", "집진기/브로워/클램프/안전거리 확인 후 작업시작 버튼을 누릅니다."],
    ["10", "첫 컷 검수", "첫 번째 절단품을 줄자로 재서 입력값과 맞는지 확인합니다."],
    ["11", "라벨 부착", "절단품에 번호와 부품명을 붙이고 다음 부품으로 넘깁니다."],
  ];

  return (
    <section className="rounded-3xl border-2 border-brand bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">초보자 시작 순서</h2>
          <p className="mt-1 text-sm text-slate-500">
            기계 앞에서 이 순서대로만 확인합니다. 모르겠으면 작업시작 전에 멈추고 담당자에게 확인합니다.
          </p>
        </div>
        <div className="rounded-2xl bg-brand px-4 py-3 text-sm font-black text-white">
          작업시작 전 8번 필수
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="factory-table">
          <thead>
            <tr>
              <th>순서</th>
              <th>기계/작업</th>
              <th>확인 내용</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([number, action, detail]) => (
              <tr key={number}>
                <td className="font-black text-brand">{number}</td>
                <td className="font-black text-ink">{action}</td>
                <td>{detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-xs font-bold text-white/60">기계 입력 1</div>
          <div className="mt-1 text-xl font-black">소재 폭</div>
          <p className="mt-2 text-sm leading-6 text-white/75">입력표 그룹 제목의 소재 폭과 기계 폭 버튼이 같아야 합니다.</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-xs font-bold text-white/60">기계 입력 2</div>
          <div className="mt-1 text-xl font-black">절단길이</div>
          <p className="mt-2 text-sm leading-6 text-white/75">입력표의 숫자를 그대로 넣습니다. 임의로 반올림하지 않습니다.</p>
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <div className="text-xs font-bold text-white/60">기계 입력 3</div>
          <div className="mt-1 text-xl font-black">횟수</div>
          <p className="mt-2 text-sm leading-6 text-white/75">같은 길이를 몇 번 자를지 입력합니다. 수량 검수와 직결됩니다.</p>
        </div>
      </div>
    </section>
  );
}

function CncWorkGuide() {
  const steps = [
    {
      title: "1. 주문/자재 확인",
      body: "주문번호, 자재명, 색상, 원판 두께를 먼저 확인합니다. 제작지시서의 원판 소요량과 실제 준비한 합판 수량이 맞아야 합니다.",
    },
    {
      title: "2. 같은 소재 폭끼리 묶기",
      body: "SE-7100K 입력표에서 같은 소재 폭 항목끼리 작업합니다. 예를 들어 소재 폭 800mm 작업을 끝낸 뒤 소재 폭 600mm 작업으로 넘어갑니다.",
    },
    {
      title: "3. 원판 1장 투입",
      body: "원판 방향과 기준면을 맞춰 올립니다. 표면 보호필름, 결 방향, 전면으로 쓸 면이 있는 자재는 작업 전 방향을 표시합니다.",
    },
    {
      title: "4. 기계 입력",
      body: "기계 화면에서 소재 폭을 선택한 뒤 입력표의 절단길이와 횟수를 1번부터 그대로 입력합니다. 톱날은 왕복으로 지나가며, 빈 줄은 0으로 둡니다.",
    },
    {
      title: "5. 시험 확인 후 절단",
      body: "첫 장은 절단 시작 전 길이와 횟수를 다시 읽어보고, 첫 컷 후 실제 치수를 재서 오차가 있으면 즉시 보정합니다.",
    },
    {
      title: "6. 라벨링",
      body: "잘린 부품에는 주문번호, 부품명, 번호를 바로 붙입니다. 도면 번호와 재단 리스트 번호를 같이 적으면 조립 단계에서 덜 헷갈립니다.",
    },
    {
      title: "7. 검수/분류",
      body: "같은 폭 작업이 끝나면 재단 리스트의 수량과 실제 부품 수량을 맞춰봅니다. 부족분이 있으면 다음 원판으로 넘어가기 전에 재컷합니다.",
    },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-ink">SE-7100K 작업 가이드</h2>
          <p className="mt-1 text-sm text-slate-500">
            기계 조작은 현장 안전수칙과 제조사 매뉴얼을 우선하고, 아래 순서는 작업표를 읽는 기준입니다.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
          첫 컷 치수 확인 필수
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl bg-soft p-4">
            <div className="text-sm font-black text-ink">{step.title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
        <b>주의:</b> 톱날, 집진, 클램프, 비상정지, 보안경/장갑 등 안전 확인은 작업자 책임으로 별도 체크해야 합니다.
        손이나 공구가 절단 영역에 들어간 상태로 작업을 시작하지 않습니다.
      </div>
    </section>
  );
}

function SheetDrawing({
  summary,
  sheetNumber,
  placements,
}: {
  summary: BoardSheetSummary;
  sheetNumber: number;
  placements: BoardPlacement[];
}) {
  const boardW = summary.sheet_width_mm;
  const boardH = summary.sheet_height_mm;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-black text-ink">
            {summary.material} / {summary.color} #{sheetNumber}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            {summary.sheet_spec_code} · {boardW}×{boardH}mm · {getSheetThicknessLabel(summary)} · {placements.length}개
          </div>
        </div>
        <div className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-brand ring-1 ring-slate-200">
          {(summary.utilization_rate * 100).toFixed(1)}%
        </div>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-md border-2 border-slate-900 bg-white"
        style={{ aspectRatio: `${boardW} / ${boardH}`, maxHeight: 460 }}
      >
        {placements.map((placement, index) => (
          <div
            key={`${placement.part_name}-${placement.piece_number}-${index}`}
            title={`${index + 1}. ${placement.part_name} ${placement.width_mm}×${placement.height_mm}mm / X${placement.x_mm} Y${placement.y_mm}${placement.rotated ? " / 회전" : ""}`}
            className="absolute overflow-hidden border border-slate-900/50 bg-cyan-100 text-[8px] font-black leading-none text-slate-900"
            style={{
              left: `${(placement.x_mm / boardW) * 100}%`,
              top: `${(placement.y_mm / boardH) * 100}%`,
              width: `${(placement.width_mm / boardW) * 100}%`,
              height: `${(placement.height_mm / boardH) * 100}%`,
              backgroundColor: sheetPieceColor(index),
            }}
          >
            <span className="block px-0.5 py-0.5">{index + 1}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-1.5 text-[11px] text-slate-600 sm:grid-cols-2">
        {placements.slice(0, 12).map((placement, index) => (
          <div key={`${placement.part_name}-legend-${placement.piece_number}-${index}`} className="truncate rounded bg-white px-2 py-1 ring-1 ring-slate-100">
            <b className="text-slate-900">{index + 1}</b> {placement.part_name} · {placement.width_mm}×{placement.height_mm}
            {placement.rotated ? " · 90도" : ""}
          </div>
        ))}
        {placements.length > 12 && (
          <div className="rounded bg-white px-2 py-1 font-bold text-slate-500 ring-1 ring-slate-100">
            외 {placements.length - 12}개는 아래 배치표에서 확인
          </div>
        )}
      </div>
    </div>
  );
}

function sheetPieceColor(index: number) {
  const colors = ["#cffafe", "#dcfce7", "#fef3c7", "#e0e7ff", "#fce7f3", "#ccfbf1"];
  return colors[index % colors.length];
}

function getSheetThicknessLabel(summary: BoardSheetSummary) {
  const spec = BOARD_SHEET_SPECS.find((candidate) => candidate.code === summary.sheet_spec_code);
  return spec ? `${spec.thicknessMm}T` : "두께 확인";
}

function FactoryTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card print:shadow-none">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-ink">{title}</h2>
        <button className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 print:hidden">CSV 다운로드</button>
      </div>
      <div className="overflow-x-auto">
        <table className="factory-table">
          <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function yn(value: boolean) {
  return value ? "O" : "-";
}
