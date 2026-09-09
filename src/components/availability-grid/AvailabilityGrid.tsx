"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { submitAvailability } from "@/lib/actions/activities";
import { useViewerTimezone } from "@/components/local-time";

export interface GridCell {
  slotIndex: number;
  startIso: string;
  endIso: string;
  initiallySelected: boolean;
}

export interface GridDay {
  dayIndex: number;
  cells: GridCell[];
}

function cellKey(dayIndex: number, slotIndex: number) {
  return `${dayIndex}:${slotIndex}`;
}

export function AvailabilityGrid({
  activityId,
  days,
}: {
  activityId: string;
  days: GridDay[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        days.flatMap((day) =>
          day.cells.filter((c) => c.initiallySelected).map((c) => cellKey(day.dayIndex, c.slotIndex)),
        ),
      ),
  );
  const dragModeRef = useRef<"select" | "deselect" | null>(null);
  const lastPointerCellRef = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tz = useViewerTimezone();

  const timeLabels = useMemo(
    () =>
      tz ? (days[0]?.cells.map((c) => formatInTimeZone(new Date(c.startIso), tz, "h:mm a")) ?? []) : [],
    [days, tz],
  );
  const dayLabels = useMemo(
    () =>
      tz
        ? days.map((day) => formatInTimeZone(new Date(day.cells[0].startIso), tz, "EEE M/d"))
        : [],
    [days, tz],
  );

  function toggleCell(dayIndex: number, slotIndex: number, forceMode?: "select" | "deselect") {
    const key = cellKey(dayIndex, slotIndex);
    setSelected((prev) => {
      const next = new Set(prev);
      const shouldSelect = forceMode ? forceMode === "select" : !next.has(key);
      if (shouldSelect) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  // Pointer Events (not mouse-only) so drag-select works with touch, mouse, and pen alike.
  // Rather than relying on per-cell enter events (which touch never fires while dragging),
  // one pointermove handler on the table looks up whatever cell is currently under the
  // pointer via elementFromPoint — that works the same way regardless of input type.
  function endDrag() {
    dragModeRef.current = null;
    lastPointerCellRef.current = null;
  }

  function handlePointerDown(e: React.PointerEvent, dayIndex: number, slotIndex: number) {
    e.preventDefault();
    const key = cellKey(dayIndex, slotIndex);
    const mode = selected.has(key) ? "deselect" : "select";
    dragModeRef.current = mode;
    lastPointerCellRef.current = key;
    toggleCell(dayIndex, slotIndex, mode);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const mode = dragModeRef.current;
    if (!mode) return;
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cellEl = target?.closest<HTMLElement>("[data-day-index]");
    if (!cellEl) return;
    const dayIndex = Number(cellEl.dataset.dayIndex);
    const slotIndex = Number(cellEl.dataset.slotIndex);
    const key = cellKey(dayIndex, slotIndex);
    if (key === lastPointerCellRef.current) return;
    lastPointerCellRef.current = key;
    toggleCell(dayIndex, slotIndex, mode);
  }

  function handleKeyDown(e: React.KeyboardEvent, dayIndex: number, slotIndex: number) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleCell(dayIndex, slotIndex);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const slots = days.flatMap((day) => mergeSelectedRanges(day, selected));
      await submitAvailability({ activityId, slots });
      toast.success("Availability saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  }

  if (days.length === 0) {
    return <p className="text-muted-foreground">This activity has no date range to show.</p>;
  }

  if (!tz) {
    return <p className="text-muted-foreground">Loading grid...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <table
          className="w-full border-collapse text-sm select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <thead>
            <tr>
              <th className="w-16 border-b p-2 text-left text-xs text-muted-foreground sm:w-20">
                Time
              </th>
              {days.map((day, i) => (
                <th
                  key={day.dayIndex}
                  className="min-w-11 border-b border-l p-2 text-center text-xs font-medium sm:min-w-16 sm:text-sm"
                >
                  {dayLabels[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeLabels.map((label, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border-b p-1 text-xs text-muted-foreground whitespace-nowrap">
                  {rowIndex % 2 === 0 ? label : ""}
                </td>
                {days.map((day, i) => {
                  const cell = day.cells[rowIndex];
                  const key = cellKey(day.dayIndex, cell.slotIndex);
                  const isSelected = selected.has(key);
                  return (
                    <td key={key} className="border-b border-l p-0">
                      <button
                        type="button"
                        data-day-index={day.dayIndex}
                        data-slot-index={cell.slotIndex}
                        aria-pressed={isSelected}
                        aria-label={`${dayLabels[i]}, ${label}, ${isSelected ? "free" : "not marked free"}`}
                        onPointerDown={(e) => handlePointerDown(e, day.dayIndex, cell.slotIndex)}
                        onKeyDown={(e) => handleKeyDown(e, day.dayIndex, cell.slotIndex)}
                        className={cn(
                          "h-8 w-full cursor-pointer touch-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:h-7",
                          isSelected ? "bg-emerald-500/80 hover:bg-emerald-500" : "hover:bg-accent",
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save availability"}
        </Button>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/80" /> Free
        </span>
      </div>
    </div>
  );
}

function mergeSelectedRanges(
  day: GridDay,
  selected: Set<string>,
): { startsAt: string; endsAt: string }[] {
  const sortedCells = [...day.cells].sort((a, b) => a.slotIndex - b.slotIndex);
  const ranges: { startsAt: string; endsAt: string }[] = [];

  let current: { startsAt: string; endsAt: string } | null = null;
  for (const cell of sortedCells) {
    const isSelected = selected.has(cellKey(day.dayIndex, cell.slotIndex));
    if (isSelected) {
      if (current && current.endsAt === cell.startIso) {
        current.endsAt = cell.endIso;
      } else {
        if (current) ranges.push(current);
        current = { startsAt: cell.startIso, endsAt: cell.endIso };
      }
    } else if (current) {
      ranges.push(current);
      current = null;
    }
  }
  if (current) ranges.push(current);

  return ranges;
}
