"use client";

import { useState, type ReactNode } from "react";
import type { KitchenModuleType } from "@/lib/kitchen";
import type { DoorStyle, DoorSwing, KitchenFixtureTarget } from "@/components/preview3d/types";
import { doorStyleLabels } from "@/components/preview3d/materials";

const baseModuleTypes: KitchenModuleType[] = ["door", "drawer", "pullout", "open", "sink_base", "cooktop", "microwave"];
const setModuleTypes: KitchenModuleType[] = ["door", "drawer", "pullout", "open", "sink_base", "cooktop", "gas", "microwave", "oven", "dishwasher"];
const handleTypeOptions = ["기본 손잡이", "댐핑", "무손잡이"];
const doorSwingOptions: Array<{ id: DoorSwing; label: string }> = [
  { id: "pair", label: "2짝(양개)" },
  { id: "left", label: "1짝(좌경첩)" },
  { id: "right", label: "1짝(우경첩)" },
  { id: "up", label: "위로" },
  { id: "down", label: "아래로" },
  { id: "up_pair", label: "2단상향" },
];

type BaseKitchenEditorState = {
  enabled: boolean;
  hasCountertop: boolean;
  hasSink: boolean;
  hasToeKick: boolean;
  doorCount: number;
  doorOptions: number[];
  toggleCountertop: () => void;
  toggleSink: () => void;
  toggleToeKick: () => void;
  changeDoorCount: (delta: number) => void;
};

type StorageEditorState = {
  enabled: boolean;
  isWardrobe: boolean;
  isShoe: boolean;
  shelfCount: number;
  doorCount: number;
  doorOptions: number[];
  openType: string;
  shoeShelfAngle: boolean;
  bottomSpace: number;
  changeShelfCount: (delta: number) => void;
  changeDoorCount: (delta: number) => void;
  setOpenType: (openType: string) => void;
  toggleShoeShelfAngle: () => void;
  changeBottomSpace: (delta: number) => void;
};

type KitchenQuickEditorState = {
  enabled: boolean;
  shelfCount: number;
  handleType: string;
  hasToeKick: boolean;
  hasSelectedModule: boolean;
  selectedModulePart?: "base" | "wall";
  selectedModuleType?: string;
  selectedDrawerCount?: number;
  moduleTypeLabels: Record<string, string>;
  changeShelfCount: (delta: number) => void;
  setHandleType: (handleType: string) => void;
  toggleToeKick: () => void;
  setModuleType: (moduleType: KitchenModuleType) => void;
  setDrawerCount: (drawerCount: number) => void;
};

function Chip({
  active,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition disabled:opacity-40 ${
        active ? "bg-brand text-white" : "bg-white/75 text-slate-700 hover:bg-white/90"
      }`}
    >
      {children}
    </button>
  );
}

export function PreviewOverlayControls({
  editable,
  storageEditor,
  kitchenEditor,
  doorStyle,
  onDoorStyleChange,
}: {
  editable: boolean;
  storageEditor?: StorageEditorState;
  kitchenEditor?: KitchenQuickEditorState;
  doorStyle?: DoorStyle;
  onDoorStyleChange?: (style: DoorStyle) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const showStorageControls = editable && storageEditor?.enabled;
  const showKitchenControls = editable && kitchenEditor?.enabled;
  const showEditPanel = editOpen && (showStorageControls || showKitchenControls || Boolean(onDoorStyleChange));
  const doorIndex = storageEditor ? storageEditor.doorOptions.indexOf(storageEditor.doorCount) : -1;
  const canDecDoor = doorIndex > 0;
  const canIncDoor = storageEditor ? doorIndex >= 0 && doorIndex < storageEditor.doorOptions.length - 1 : false;
  const hasEditActions = showStorageControls || showKitchenControls || Boolean(onDoorStyleChange);
  const kitchenModuleTypes = kitchenEditor?.selectedModulePart === "wall"
    ? (["door", "open", "microwave"] as KitchenModuleType[])
    : (["door", "drawer", "pullout", "open", "sink_base", "cooktop"] as KitchenModuleType[]);

  return (
    <>
      {/* 하단: 편집 토글 — 기본 접힘 */}
      {editable && hasEditActions && (
        <div className="pointer-events-none absolute top-2 right-2 z-50 flex justify-end">
          <button
            type="button"
            onClick={() => setEditOpen((open) => !open)}
            className="pointer-events-auto rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-[10px] font-black text-slate-700 shadow-sm backdrop-blur-sm"
          >
            {editOpen ? "편집 닫기 ▼" : "편집 ▲"}
          </button>
        </div>
      )}

      {/* 펼친 편집 패널 — 최대 높이 제한 + 스크롤 */}
      {showEditPanel && (
        <div
          className={`pointer-events-auto absolute z-[60] overflow-y-auto border border-white/70 bg-white/92 p-3 shadow-xl backdrop-blur-md ${
            "top-12 right-2 max-h-[min(46vh,320px)] w-[min(390px,calc(100%-16px))] rounded-xl"
          }`}
        >
          {onDoorStyleChange && doorStyle && (
            <div className="mb-2 flex gap-1 overflow-x-auto pb-0.5">
              {(Object.entries(doorStyleLabels) as [DoorStyle, string][]).map(([style, label]) => (
                <Chip key={style} active={doorStyle === style} onClick={() => onDoorStyleChange(style)}>
                  {label.replace(" 문짝", "")}
                </Chip>
              ))}
            </div>
          )}

          {showStorageControls && storageEditor && (
            <div className="space-y-2">
              <div className="text-[10px] font-black text-slate-600">{storageEditor.isWardrobe ? "붙박이장" : "신발장"} 편집</div>
              <div className="flex flex-wrap gap-1">
                <Chip onClick={() => storageEditor.changeShelfCount(-1)} disabled={storageEditor.shelfCount <= 0}>선반 −</Chip>
                <span className="px-1 text-[10px] font-bold text-slate-500">{storageEditor.shelfCount}</span>
                <Chip onClick={() => storageEditor.changeShelfCount(1)} disabled={storageEditor.shelfCount >= 12}>선반 +</Chip>
                <Chip onClick={() => storageEditor.changeDoorCount(-1)} disabled={!canDecDoor}>문 −</Chip>
                <span className="px-1 text-[10px] font-bold text-slate-500">{storageEditor.doorCount}개</span>
                <Chip onClick={() => storageEditor.changeDoorCount(1)} disabled={!canIncDoor}>문 +</Chip>
              </div>
              {storageEditor.isWardrobe && (
                <div className="flex gap-1">
                  {["여닫이", "슬라이딩"].map((openType) => (
                    <Chip key={openType} active={storageEditor.openType.includes(openType)} onClick={() => storageEditor.setOpenType(openType)}>
                      {openType}
                    </Chip>
                  ))}
                </div>
              )}
              {storageEditor.isShoe && (
                <div className="flex flex-wrap gap-1">
                  <Chip active={storageEditor.shoeShelfAngle} onClick={storageEditor.toggleShoeShelfAngle}>경사선반</Chip>
                  <Chip onClick={() => storageEditor.changeBottomSpace(-20)} disabled={storageEditor.bottomSpace <= 0}>하부 −</Chip>
                  <span className="px-1 text-[10px] font-bold text-slate-500">{storageEditor.bottomSpace}mm</span>
                  <Chip onClick={() => storageEditor.changeBottomSpace(20)} disabled={storageEditor.bottomSpace >= 200}>하부 +</Chip>
                </div>
              )}
            </div>
          )}

          {showKitchenControls && kitchenEditor && (
            <div className="space-y-3">
              <div className="text-[10px] font-black text-slate-600">주방 빠른 편집</div>

              <section>
                <div className="mb-1.5 text-[10px] font-black text-slate-500">마감</div>
                <div className="flex flex-wrap gap-1 pb-0.5">
                  {handleTypeOptions.map((option) => (
                    <Chip key={option} active={kitchenEditor.handleType === option} onClick={() => kitchenEditor.setHandleType(option)}>
                      {option.replace(" 손잡이", "")}
                    </Chip>
                  ))}
                  <Chip active={kitchenEditor.hasToeKick} onClick={kitchenEditor.toggleToeKick}>걸레받이</Chip>
                </div>
              </section>

              <section>
                <div className="mb-1.5 text-[10px] font-black text-slate-500">선반 수</div>
                <div className="flex items-center gap-1">
                  <Chip onClick={() => kitchenEditor.changeShelfCount(-1)} disabled={kitchenEditor.shelfCount <= 0}>선반 -</Chip>
                  <span className="min-w-8 text-center text-[11px] font-black text-slate-700">{kitchenEditor.shelfCount}</span>
                  <Chip onClick={() => kitchenEditor.changeShelfCount(1)} disabled={kitchenEditor.shelfCount >= 12}>선반 +</Chip>
                </div>
              </section>

              <section>
                <div className="mb-1.5 text-[10px] font-black text-slate-500">선택 장 구성</div>
                {kitchenEditor.hasSelectedModule ? (
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {kitchenModuleTypes.map((moduleType) => (
                      <Chip key={moduleType} active={kitchenEditor.selectedModuleType === moduleType} onClick={() => kitchenEditor.setModuleType(moduleType)}>
                        {kitchenEditor.moduleTypeLabels[moduleType] ?? moduleType}
                      </Chip>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-500">
                    3D에서 장을 선택하면 서랍장/문/오픈장으로 바꿀 수 있습니다.
                  </div>
                )}
              </section>

              {kitchenEditor.hasSelectedModule && kitchenEditor.selectedModuleType === "drawer" && (
                <section>
                  <div className="mb-1.5 text-[10px] font-black text-slate-500">서랍 단수</div>
                  <div className="flex gap-1 overflow-x-auto pb-0.5">
                    {[1, 2, 3].map((count) => (
                      <Chip key={count} active={(kitchenEditor.selectedDrawerCount ?? 3) === count} onClick={() => kitchenEditor.setDrawerCount(count)}>
                        {count}단
                      </Chip>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function KitchenSelectionPanel({
  editable,
  isKitchenSet,
  isKitchenBase,
  baseKitchenEditor,
  doorStyle,
  selectedModuleIndex,
  hasSelectedModule,
  selectedFixture,
  selectedModulePart,
  selectedModuleType,
  selectedDrawerCount,
  selectedDoorSwing,
  handleType,
  hasToeKick,
  moduleTypeLabels,
  onClearSelection,
  onChangeModuleType,
  onDrawerCountChange,
  onDoorStyleChange,
  onDoorSwingChange,
  onHandleTypeChange,
  onToggleToeKick,
  onAddHood,
  onAddRange,
  sinkOption,
  faucetOption,
  cooktopOption,
  hoodOption,
  sinkOptions,
  faucetOptions,
  cooktopOptions,
  hoodOptions,
  onFixtureOptionChange,
}: {
  editable: boolean;
  isKitchenSet: boolean;
  isKitchenBase: boolean;
  baseKitchenEditor?: BaseKitchenEditorState;
  doorStyle?: DoorStyle;
  selectedModuleIndex: number | null;
  hasSelectedModule: boolean;
  selectedFixture?: KitchenFixtureTarget | null;
  selectedModulePart?: "base" | "wall";
  selectedModuleType?: string;
  selectedDrawerCount?: number;
  selectedDoorSwing: DoorSwing;
  handleType: string;
  hasToeKick?: boolean;
  moduleTypeLabels: Record<string, string>;
  onClearSelection?: () => void;
  onChangeModuleType?: (type: KitchenModuleType) => void;
  onDrawerCountChange?: (drawerCount: number) => void;
  onDoorStyleChange?: (style: DoorStyle) => void;
  onDoorSwingChange?: (swing: DoorSwing) => void;
  onHandleTypeChange?: (handleType: string) => void;
  onToggleToeKick?: () => void;
  onAddHood?: () => void;
  onAddRange?: () => void;
  sinkOption?: string;
  faucetOption?: string;
  cooktopOption?: string;
  hoodOption?: string;
  sinkOptions?: Array<{ id: string; name: string }>;
  faucetOptions?: Array<{ id: string; name: string }>;
  cooktopOptions?: Array<{ id: string; name: string }>;
  hoodOptions?: Array<{ id: string; name: string }>;
  onFixtureOptionChange?: (key: "sink_option" | "faucet_option" | "cooktop_option" | "hood_option", value: string) => void;
}) {
  if (!editable || !hasSelectedModule || (!isKitchenSet && !isKitchenBase)) return null;

  const moduleTypes = isKitchenSet ? setModuleTypes : baseModuleTypes;
  const selectedIndex = selectedModuleIndex ?? 0;
  const isWall = selectedModulePart === "wall";
  const hasFixtureSelection = isKitchenSet && Boolean(selectedFixture);
  const canEditModuleType = !isWall;
  const canEditHandle = isWall && !isKitchenBase;
  const visibleDoorSwingOptions = isWall ? doorSwingOptions : doorSwingOptions.filter((option) => option.id === "pair" || option.id === "left" || option.id === "right");
  const fixtureLabel = selectedFixture === "sink" ? "싱크볼+수전" : selectedFixture === "cooktop" ? "쿡탑/레인지" : selectedFixture === "hood" ? "후드" : "";
  const selectedLabel = hasFixtureSelection ? `${selectedIndex + 1}번 ${fixtureLabel}` : isKitchenBase ? "하부장" : `${selectedIndex + 1}번 ${isWall ? "상부장" : "하부장"}`;

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-3 sm:px-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-slate-500">선택한 항목</div>
          <div className="mt-0.5 text-sm font-black text-ink">{selectedLabel}</div>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
        >
          선택 해제
        </button>
      </div>

      {hasFixtureSelection ? (
        <div className="space-y-3">
          {selectedFixture === "sink" && (
            <>
              <FixtureOptionRow
                label="싱크볼 규격"
                value={sinkOption ?? "none"}
                options={sinkOptions ?? []}
                onChange={(value) => onFixtureOptionChange?.("sink_option", value)}
              />
              <FixtureOptionRow
                label="수전"
                value={faucetOption ?? "none"}
                options={faucetOptions ?? []}
                onChange={(value) => onFixtureOptionChange?.("faucet_option", value)}
              />
              <div className="rounded-xl bg-cyan-50 px-3 py-2 text-[11px] font-bold leading-5 text-cyan-900">
                수전은 싱크볼 위치를 따라갑니다. 이동하면 싱크볼과 수전이 같이 이동합니다.
              </div>
            </>
          )}
          {selectedFixture === "cooktop" && (
            <FixtureOptionRow
              label="쿡탑/레인지"
              value={cooktopOption ?? "none"}
              options={cooktopOptions ?? []}
              onChange={(value) => onFixtureOptionChange?.("cooktop_option", value)}
            />
          )}
          {selectedFixture === "hood" && (
            <FixtureOptionRow
              label="후드 규격"
              value={hoodOption ?? "none"}
              options={hoodOptions ?? []}
              onChange={(value) => onFixtureOptionChange?.("hood_option", value)}
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(canEditModuleType || isKitchenBase) && (
          <section>
            <div className="mb-1.5 text-[11px] font-black text-slate-500">장 구성</div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {canEditModuleType && moduleTypes.map((moduleType) => (
                <Chip key={moduleType} active={selectedModuleType === moduleType} onClick={() => onChangeModuleType?.(moduleType)}>
                  {moduleTypeLabels[moduleType] ?? moduleType}
                </Chip>
              ))}
              {isKitchenSet && onToggleToeKick && (
                <Chip active={hasToeKick} onClick={onToggleToeKick}>걸레받이</Chip>
              )}
              {isKitchenBase && baseKitchenEditor?.enabled && (
                <>
                  <Chip active={baseKitchenEditor.hasCountertop} onClick={baseKitchenEditor.toggleCountertop}>상판</Chip>
                  <Chip active={baseKitchenEditor.hasSink} onClick={baseKitchenEditor.toggleSink}>싱크</Chip>
                  <Chip active={baseKitchenEditor.hasToeKick} onClick={baseKitchenEditor.toggleToeKick}>걸레받이</Chip>
                </>
              )}
            </div>
          </section>
        )}

        {selectedModuleType === "drawer" && (
          <section>
            <div className="mb-1.5 text-[11px] font-black text-slate-500">서랍 단수</div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {[1, 2, 3].map((count) => (
                <Chip key={count} active={(selectedDrawerCount ?? 3) === count} onClick={() => onDrawerCountChange?.(count)}>
                  {count}단
                </Chip>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-1.5 text-[11px] font-black text-slate-500">문</div>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {onDoorStyleChange && doorStyle && (Object.entries(doorStyleLabels) as [DoorStyle, string][]).map(([style, label]) => (
              <Chip key={style} active={doorStyle === style} onClick={() => onDoorStyleChange(style)}>
                {label.replace(" 문짝", "")}
              </Chip>
            ))}
          </div>
          <div className="mt-1 flex gap-1 overflow-x-auto pb-0.5">
            {visibleDoorSwingOptions.map((option) => (
              <Chip key={option.id} active={selectedDoorSwing === option.id} onClick={() => onDoorSwingChange?.(option.id)}>
                {option.label}
              </Chip>
            ))}
          </div>
        </section>

        {canEditHandle && (
          <section>
            <div className="mb-1.5 text-[11px] font-black text-slate-500">손잡이</div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {handleTypeOptions.map((option) => (
                <Chip key={option} active={handleType === option} onClick={() => onHandleTypeChange?.(option)}>
                  {option.replace(" 손잡이", "")}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {isKitchenSet && (
          <section>
            <div className="mb-1.5 text-[11px] font-black text-slate-500">설비</div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              <Chip onClick={onAddHood} disabled={!onAddHood}>후드 추가</Chip>
              <Chip onClick={onAddRange} disabled={!onAddRange}>레인지 추가</Chip>
            </div>
          </section>
        )}
        </div>
      )}
    </div>
  );
}

function FixtureOptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; name: string }>;
  onChange?: (value: string) => void;
}) {
  return (
    <section>
      <div className="mb-1.5 text-[11px] font-black text-slate-500">{label}</div>
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {options.map((option) => (
          <Chip key={option.id} active={value === option.id} onClick={() => onChange?.(option.id)}>
            {option.name.replace("싱크볼 ", "").replace("하츠 ", "").replace("파세코 ", "")}
          </Chip>
        ))}
      </div>
    </section>
  );
}
