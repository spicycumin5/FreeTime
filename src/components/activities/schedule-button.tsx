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
    if (!confirm("Create a Google Calendar event and invite the whole party for this time?")) {
      return;
    }
    setPending(true);
    try {
      await scheduleActivity({ activityId, chosenStart, chosenEnd });
      toast.success("Scheduled! Calendar invites are on their way.");
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
