import { generateSlotGrid, GridParams, GridSlot } from "./grid";

export interface AvailabilityResponseInput {
  userId: string;
  slots: { startsAt: Date; endsAt: Date }[];
}

export interface ActivityForScheduling extends GridParams {
  durationMinutes: number;
}

export interface BestTimeWindow {
  start: Date;
  end: Date;
  freeUserIds: string[];
  score: number;
}

/**
 * Ranks candidate time windows (matching the activity's duration) by how many
 * respondents are free for the *entire* window. Pure function over already-loaded
 * data so it's easy to unit test against fixed fixtures.
 */
export function computeBestTimes(
  activity: ActivityForScheduling,
  responses: AvailabilityResponseInput[],
  topN = 5,
): BestTimeWindow[] {
  const grid = generateSlotGrid(activity);
  if (grid.length === 0 || responses.length === 0) return [];

  const freeByUser = new Map<string, Set<string>>();
  for (const response of responses) {
    const freeKeys = new Set<string>();
    for (const gridSlot of grid) {
      const covered = response.slots.some(
        (s) =>
          s.startsAt.getTime() <= gridSlot.start.getTime() &&
          s.endsAt.getTime() >= gridSlot.end.getTime(),
      );
      if (covered) freeKeys.add(slotKey(gridSlot));
    }
    freeByUser.set(response.userId, freeKeys);
  }

  const windowSlotCount = Math.max(
    1,
    Math.round(activity.durationMinutes / activity.slotGranularityMinutes),
  );

  const byDay = new Map<number, GridSlot[]>();
  for (const gridSlot of grid) {
    if (!byDay.has(gridSlot.dayIndex)) byDay.set(gridSlot.dayIndex, []);
    byDay.get(gridSlot.dayIndex)!.push(gridSlot);
  }

  const candidates: BestTimeWindow[] = [];
  for (const daySlots of byDay.values()) {
    daySlots.sort((a, b) => a.slotIndex - b.slotIndex);
    for (let i = 0; i + windowSlotCount <= daySlots.length; i++) {
      const windowSlots = daySlots.slice(i, i + windowSlotCount);
      const freeUserIds: string[] = [];
      for (const [userId, freeKeys] of freeByUser) {
        const fullyFree = windowSlots.every((s) => freeKeys.has(slotKey(s)));
        if (fullyFree) freeUserIds.push(userId);
      }
      if (freeUserIds.length === 0) continue;
      candidates.push({
        start: windowSlots[0].start,
        end: windowSlots[windowSlots.length - 1].end,
        freeUserIds,
        score: freeUserIds.length,
      });
    }
  }

  candidates.sort(
    (a, b) => b.score - a.score || a.start.getTime() - b.start.getTime(),
  );

  // Non-max suppression: don't surface several near-duplicate windows that
  // just shift a few minutes within an already-picked, higher-scoring window.
  const picked: BestTimeWindow[] = [];
  for (const candidate of candidates) {
    const overlaps = picked.some(
      (p) =>
        candidate.start.getTime() < p.end.getTime() &&
        candidate.end.getTime() > p.start.getTime(),
    );
    if (!overlaps) picked.push(candidate);
    if (picked.length >= topN) break;
  }

  return picked;
}

function slotKey(slot: GridSlot): string {
  return `${slot.start.getTime()}-${slot.end.getTime()}`;
}
