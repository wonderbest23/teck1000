import type { FurnitureInput } from "@/lib/types";

export function Preview2D({ input }: { input: FurnitureInput }) {
  const shelves = Array.from({ length: Math.max(0, input.shelf_count) });
  const doors = input.has_door || input.productType === "shoe_cabinet" ? Array.from({ length: Math.max(1, input.door_count) }) : [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
        <span>2D 정면 미리보기</span>
        <span>{input.width_mm} x {input.height_mm} x {input.depth_mm}mm</span>
      </div>
      <div className="relative mx-auto flex aspect-[3/4] max-h-[420px] min-h-[260px] w-full max-w-[340px] flex-col justify-between border-4 border-slate-700 bg-slate-50">
        {shelves.map((_, index) => (
          <div key={index} className="absolute left-0 right-0 border-t-4 border-slate-700" style={{ top: `${((index + 1) / (shelves.length + 1)) * 100}%` }} />
        ))}
        {doors.length > 0 && (
          <div className="absolute inset-0 flex bg-white/35">
            {doors.map((_, index) => (
              <div key={index} className="h-full flex-1 border-r-2 border-dashed border-slate-500 last:border-r-0" />
            ))}
          </div>
        )}
        <div className="absolute bottom-2 left-2 rounded bg-white px-2 py-1 text-xs font-bold text-slate-600">{input.color}</div>
      </div>
    </div>
  );
}
