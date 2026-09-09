"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createActivity } from "@/lib/actions/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "23:00";

/** A time-of-day input can't represent "24:00" (end of day), only "00:00" — and
 * nobody picking a *latest* time means "the very start of the day," so treat a
 * midnight "Latest time" as end-of-day (1440 minutes) instead of 0. */
function timeToMinutes(value: string, { isEndOfDay = false } = {}): number {
  if (!value) return isEndOfDay ? 24 * 60 : 0;
  const [hours, minutes] = value.split(":").map(Number);
  const total = hours * 60 + minutes;
  return isEndOfDay && total === 0 ? 24 * 60 : total;
}

export function NewActivityForm({ partyId }: { partyId: string }) {
  const timezoneRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [dailyWindowStart, setDailyWindowStart] = useState(DEFAULT_START_TIME);
  const [dailyWindowEnd, setDailyWindowEnd] = useState(DEFAULT_END_TIME);

  const startMinute = useMemo(() => timeToMinutes(dailyWindowStart), [dailyWindowStart]);
  const endMinute = useMemo(
    () => timeToMinutes(dailyWindowEnd, { isEndOfDay: true }),
    [dailyWindowEnd],
  );

  const dateRangeError =
    rangeStart && rangeEnd && rangeEnd < rangeStart
      ? "Search until can't be before search from."
      : null;
  const timeWindowError =
    endMinute <= startMinute ? "Latest time must be after the earliest time." : null;
  const formError = dateRangeError ?? timeWindowError;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formError) return;
    if (timezoneRef.current && !timezoneRef.current.value) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("dailyWindowStartMinute", String(startMinute));
    formData.set("dailyWindowEndMinute", String(endMinute));
    setSubmitting(true);
    try {
      await createActivity(partyId, formData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create activity");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input ref={timezoneRef} type="hidden" name="timezone" />

      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Movie Night" required maxLength={150} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" maxLength={2000} rows={2} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <Select name="type" defaultValue="MOVIE_NIGHT">
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MOVIE_NIGHT">Movie night (adds movie voting)</SelectItem>
            <SelectItem value="GENERIC">Generic activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="rangeStart">Search from</Label>
          <Input
            id="rangeStart"
            name="rangeStart"
            type="date"
            required
            value={rangeStart}
            onChange={(e) => {
              setRangeStart(e.target.value);
              if (rangeEnd && rangeEnd < e.target.value) setRangeEnd(e.target.value);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rangeEnd">Search until</Label>
          <Input
            id="rangeEnd"
            name="rangeEnd"
            type="date"
            required
            min={rangeStart || undefined}
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
          />
        </div>
      </div>
      {dateRangeError && <p className="text-sm text-destructive">{dateRangeError}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dailyWindowStart">Earliest time each day</Label>
          <Input
            id="dailyWindowStart"
            name="dailyWindowStart"
            type="time"
            required
            value={dailyWindowStart}
            onChange={(e) => setDailyWindowStart(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dailyWindowEnd">Latest time each day</Label>
          <Input
            id="dailyWindowEnd"
            name="dailyWindowEnd"
            type="time"
            required
            value={dailyWindowEnd}
            onChange={(e) => setDailyWindowEnd(e.target.value)}
          />
        </div>
      </div>
      {timeWindowError && !dateRangeError && (
        <p className="text-sm text-destructive">{timeWindowError}</p>
      )}
      <p className="text-xs text-muted-foreground -mt-2">
        Picking 12:00 AM for the latest time means midnight at the end of the day.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="durationMinutes">Activity length</Label>
          <Select name="durationMinutes" defaultValue="120">
            <SelectTrigger id="durationMinutes" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="180">3 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="slotGranularityMinutes">Grid precision</Label>
          <Select name="slotGranularityMinutes" defaultValue="30">
            <SelectTrigger id="slotGranularityMinutes" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={submitting || !!formError}>
        {submitting ? "Creating..." : "Create activity"}
      </Button>
    </form>
  );
}
