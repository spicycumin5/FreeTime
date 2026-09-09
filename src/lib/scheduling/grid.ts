import { addDays, addMinutes, differenceInCalendarDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export interface GridSlot {
  start: Date; // UTC instant
  end: Date; // UTC instant
  dayIndex: number;
  slotIndex: number; // index within the day
}

export interface GridParams {
  rangeStart: Date;
  rangeEnd: Date;
  dailyWindowStartMinute: number;
  dailyWindowEndMinute: number;
  slotGranularityMinutes: number;
  timezone: string;
}

/**
 * Builds the atomic time-slot grid for an activity's availability picker,
 * expressed as UTC instants. rangeStart/rangeEnd are UTC instants marking
 * midnight of the first/last day *in the activity's timezone*.
 */
export function generateSlotGrid(params: GridParams): GridSlot[] {
  const {
    timezone,
    dailyWindowStartMinute,
    dailyWindowEndMinute,
    slotGranularityMinutes,
  } = params;

  const startLocalDay = toZonedTime(params.rangeStart, timezone);
  const endLocalDay = toZonedTime(params.rangeEnd, timezone);
  const dayCount = differenceInCalendarDays(endLocalDay, startLocalDay) + 1;

  const slots: GridSlot[] = [];
  for (let dayIndex = 0; dayIndex < dayCount; dayIndex++) {
    const day = addDays(startLocalDay, dayIndex);
    const year = day.getFullYear();
    const month = day.getMonth();
    const date = day.getDate();

    let slotIndex = 0;
    for (
      let minute = dailyWindowStartMinute;
      minute + slotGranularityMinutes <= dailyWindowEndMinute;
      minute += slotGranularityMinutes
    ) {
      const localWallClock = new Date(year, month, date, 0, minute, 0, 0);
      const start = fromZonedTime(localWallClock, timezone);
      const end = fromZonedTime(
        addMinutes(localWallClock, slotGranularityMinutes),
        timezone,
      );
      slots.push({ start, end, dayIndex, slotIndex });
      slotIndex++;
    }
  }
  return slots;
}

/** Converts a yyyy-MM-dd date-only string (interpreted in `timezone`) to a UTC instant at local midnight. */
export function dateOnlyToUtcMidnight(dateOnly: string, timezone: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return fromZonedTime(new Date(year, month - 1, day, 0, 0, 0, 0), timezone);
}
