"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { scheduleActivity } from "@/lib/actions/activities";

export function ScheduleButton({
  activityId,
  chosenStart,
  chosenEnd,
}: {
  activityId: string;
  chosenStart: string;
  chosenEnd: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Confirm this time for the activity?")) {
      return;
    }
    setPending(true);
    try {
      await scheduleActivity({ activityId, chosenStart, chosenEnd });
      toast.success("Scheduled! Everyone can add it to their own calendar from here.");
      router.push(`/activities/${activityId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      {pending ? "Scheduling…" : "Confirm this time"}
    </Button>
  );
}
