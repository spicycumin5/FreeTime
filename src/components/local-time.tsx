"use client";

import { useSyncExternalStore } from "react";
import { formatInTimeZone } from "date-fns-tz";

function subscribeNoop() {
  return () => {};
}

/**
 * The viewer's timezone is unknowable on the server, so this returns null for the
 * server-rendered/initial-hydration snapshot and the real value right after mount —
 * via useSyncExternalStore rather than an effect, so there's no hydration mismatch.
 */
export function useViewerTimezone(): string | null {
  return useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}

/** Renders an instant in the viewer's own browser-detected timezone (not the activity's). */
export function LocalTime({
  iso,
  format,
  placeholder = "…",
}: {
  iso: string;
  format: string;
  placeholder?: string;
}) {
  const tz = useViewerTimezone();
  if (!tz) return <>{placeholder}</>;
  return <>{formatInTimeZone(new Date(iso), tz, format)}</>;
}

/** Renders a start–end range in the viewer's own timezone, sharing one tz lookup. */
export function LocalRange({
  startIso,
  endIso,
  dateFormat,
  timeFormat = "h:mm a",
  placeholder = "…",
}: {
  startIso: string;
  endIso: string;
  dateFormat: string;
  timeFormat?: string;
  placeholder?: string;
}) {
  const tz = useViewerTimezone();
  if (!tz) return <>{placeholder}</>;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = formatInTimeZone(start, tz, "yyyy-MM-dd") === formatInTimeZone(end, tz, "yyyy-MM-dd");
  return (
    <>
      {formatInTimeZone(start, tz, dateFormat)}
      {" – "}
      {sameDay ? formatInTimeZone(end, tz, timeFormat) : formatInTimeZone(end, tz, dateFormat)}
    </>
  );
}

/** Small caption showing the viewer's detected timezone, e.g. "Times shown in America/New_York." */
export function ViewerTimezoneNote() {
  const tz = useViewerTimezone();
  if (!tz) return null;
  return <>Times shown in your local time zone ({tz}).</>;
}
