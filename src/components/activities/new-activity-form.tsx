"use client";

import { useRef, useState } from "react";
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

export function NewActivityForm({ partyId }: { partyId: string }) {
  const timezoneRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (timezoneRef.current && !timezoneRef.current.value) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    const formData = new FormData(e.currentTarget);
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
          <Input id="rangeStart" name="rangeStart" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rangeEnd">Search until</Label>
          <Input id="rangeEnd" name="rangeEnd" type="date" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="dailyWindowStart">Earliest time each day</Label>
          <Input
            id="dailyWindowStart"
            name="dailyWindowStart"
            type="time"
            defaultValue="09:00"
            required
            onChange={(e) => syncMinuteField(e.currentTarget, "dailyWindowStartMinute")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dailyWindowEnd">Latest time each day</Label>
          <Input
            id="dailyWindowEnd"
            name="dailyWindowEnd"
            type="time"
            defaultValue="23:00"
            required
            onChange={(e) => syncMinuteField(e.currentTarget, "dailyWindowEndMinute")}
          />
        </div>
      </div>
      <input type="hidden" name="dailyWindowStartMinute" defaultValue={9 * 60} />
      <input type="hidden" name="dailyWindowEndMinute" defaultValue={23 * 60} />

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

      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create activity"}
      </Button>
    </form>
  );
}

function syncMinuteField(input: HTMLInputElement, hiddenFieldName: string) {
  const [hours, minutes] = input.value.split(":").map(Number);
  const hidden = input.form?.elements.namedItem(hiddenFieldName) as HTMLInputElement | null;
  if (hidden) hidden.value = String(hours * 60 + minutes);
}
