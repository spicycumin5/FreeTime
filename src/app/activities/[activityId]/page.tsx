import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireActivityAccess } from "@/lib/actions/guards";
import { ActivityNav } from "@/components/activities/activity-nav";
import { Badge } from "@/components/ui/badge";
import { LocalRange, LocalTime, ViewerTimezoneNote } from "@/components/local-time";
import { generateSlotGrid } from "@/lib/scheduling/grid";

export default async function ActivityOverviewPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const { activity } = await requireActivityAccess(activityId);

  const full = await prisma.activity.findUnique({
    where: { id: activity.id },
    include: {
      party: true,
      scheduledEvent: true,
      availabilityResponses: { select: { userId: true } },
      _count: { select: { availabilityResponses: true } },
    },
  });
  if (!full) notFound();

  const memberCount = await prisma.partyMember.count({ where: { partyId: full.partyId } });

  const grid = generateSlotGrid(full);
  const searchWindowStart = grid[0]?.start;
  const searchWindowEnd = grid[grid.length - 1]?.end;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">{full.party.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{full.title}</h1>
        {full.description && <p className="mt-1 text-muted-foreground">{full.description}</p>}
      </div>

      <ActivityNav activityId={full.id} showMovies={full.type === "MOVIE_NIGHT"} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{full.status.replaceAll("_", " ")}</Badge>
          <span className="text-sm text-muted-foreground">
            {full._count.availabilityResponses} of {memberCount} responded
          </span>
        </div>

        {searchWindowStart && searchWindowEnd && full.status !== "SCHEDULED" && (
          <div className="text-sm text-muted-foreground">
            <p>
              Searching{" "}
              <LocalRange
                startIso={searchWindowStart.toISOString()}
                endIso={searchWindowEnd.toISOString()}
                dateFormat="MMM d, h:mm a"
              />
            </p>
            <p className="text-xs">
              <ViewerTimezoneNote />
            </p>
          </div>
        )}

        {full.scheduledEvent && (
          <div className="rounded-md border bg-accent/50 p-4">
            <p className="font-medium">
              Scheduled for{" "}
              <LocalTime
                iso={full.scheduledEvent.chosenStart.toISOString()}
                format="EEEE, MMM d 'at' h:mm a"
              />
            </p>
            {full.scheduledEvent.googleCalendarLink && (
              <a
                href={full.scheduledEvent.googleCalendarLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-2"
              >
                View on Google Calendar
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
