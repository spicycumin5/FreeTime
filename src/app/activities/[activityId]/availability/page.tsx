import { prisma } from "@/lib/db";
import { requireActivityAccess } from "@/lib/actions/guards";
import { ActivityNav } from "@/components/activities/activity-nav";
import { AvailabilityGrid } from "@/components/availability-grid/AvailabilityGrid";
import { ViewerTimezoneNote } from "@/components/local-time";
import { generateSlotGrid } from "@/lib/scheduling/grid";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const { session, activity } = await requireActivityAccess(activityId);

  const gridSlots = generateSlotGrid(activity);

  const existingResponse = await prisma.availabilityResponse.findUnique({
    where: { activityId_userId: { activityId: activity.id, userId: session.user.id } },
    include: { slots: true },
  });

  const days = groupByDay(gridSlots, existingResponse?.slots ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{activity.title}</h1>
      </div>

      <ActivityNav activityId={activity.id} showMovies={activity.type === "MOVIE_NIGHT"} />

      <p className="text-sm text-muted-foreground">
        Click, or click and drag, to mark when you&apos;re free. <ViewerTimezoneNote />
      </p>

      <AvailabilityGrid activityId={activity.id} days={days} />
    </div>
  );
}

function groupByDay(
  gridSlots: ReturnType<typeof generateSlotGrid>,
  existingSlots: { startsAt: Date; endsAt: Date }[],
) {
  const byDay = new Map<
    number,
    { dayIndex: number; cells: { slotIndex: number; startIso: string; endIso: string; initiallySelected: boolean }[] }
  >();

  for (const slot of gridSlots) {
    if (!byDay.has(slot.dayIndex)) {
      byDay.set(slot.dayIndex, { dayIndex: slot.dayIndex, cells: [] });
    }
    const initiallySelected = existingSlots.some(
      (s) => s.startsAt.getTime() <= slot.start.getTime() && s.endsAt.getTime() >= slot.end.getTime(),
    );
    byDay.get(slot.dayIndex)!.cells.push({
      slotIndex: slot.slotIndex,
      startIso: slot.start.toISOString(),
      endIso: slot.end.toISOString(),
      initiallySelected,
    });
  }

  return Array.from(byDay.values()).sort((a, b) => a.dayIndex - b.dayIndex);
}
