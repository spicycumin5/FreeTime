"use client";

import { useMemo, useState } from "react";
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
  const [dragMode, setDragMode] = useState<"select" | "deselect" | null>(null);
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

  function handleMouseDown(dayIndex: number, slotIndex: number) {
    const key = cellKey(dayIndex, slotIndex);
    const mode = selected.has(key) ? "deselect" : "select";
    setDragMode(mode);
    toggleCell(dayIndex, slotIndex, mode);
  }

  function handleMouseEnter(dayIndex: number, slotIndex: number) {
    if (!dragMode) return;
    toggleCell(dayIndex, slotIndex, dragMode);
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
    <div className="flex flex-col gap-4" onMouseUp={() => setDragMode(null)}>
      <div className="overflow-x-auto rounded-md border select-none">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-20 border-b p-2 text-left text-xs text-muted-foreground">Time</th>
              {days.map((day, i) => (
                <th key={day.dayIndex} className="border-b border-l p-2 text-center font-medium">
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
                {days.map((day) => {
                  const cell = day.cells[rowIndex];
                  const key = cellKey(day.dayIndex, cell.slotIndex);
                  const isSelected = selected.has(key);
                  return (
                    <td
                      key={key}
                      onMouseDown={() => handleMouseDown(day.dayIndex, cell.slotIndex)}
                      onMouseEnter={() => handleMouseEnter(day.dayIndex, cell.slotIndex)}
                      className={cn(
                        "h-6 cursor-pointer border-b border-l transition-colors",
                        isSelected ? "bg-emerald-500/80 hover:bg-emerald-500" : "hover:bg-accent",
                      )}
                    />
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
