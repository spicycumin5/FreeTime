"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { stopActivitySeries } from "@/lib/actions/activities";

export function StopSeriesButton({ seriesId }: { seriesId: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Stop this recurring activity? Past rounds stay, but no new ones will be created.")) {
      return;
    }
    setPending(true);
    try {
      await stopActivitySeries(seriesId);
      toast.success("Stopped");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? "Stopping…" : "Stop"}
    </Button>
  );
}
