import { prisma } from "@/lib/db";
import { requireActivityAccess } from "@/lib/actions/guards";
import { ActivityNav } from "@/components/activities/activity-nav";
import { computeBestTimes } from "@/lib/scheduling/bestTime";
import { ScheduleButton } from "@/components/activities/schedule-button";
import { Card, CardContent } from "@/components/ui/card";
import { LocalRange, ViewerTimezoneNote } from "@/components/local-time";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ activityId: string }>;
}) {
  const { activityId } = await params;
  const { session, activity } = await requireActivityAccess(activityId);

  const [responses, members] = await Promise.all([
    prisma.availabilityResponse.findMany({
      where: { activityId: activity.id },
      include: { slots: true, user: true },
    }),
    prisma.partyMember.findMany({
      where: { partyId: activity.partyId },
      include: { user: true },
    }),
  ]);

  const userNameById = new Map(members.map((m) => [m.userId, m.user.name ?? m.user.email ?? "Someone"]));

  const bestTimes =
    activity.status === "SCHEDULED"
      ? []
      : computeBestTimes(
          activity,
          responses.map((r) => ({
            userId: r.userId,
            slots: r.slots.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt })),
          })),
        );

  const isOrganizer = activity.createdById === session.user.id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{activity.title}</h1>
      </div>

      <ActivityNav activityId={activity.id} showMovies={activity.type === "MOVIE_NIGHT"} />

      {responses.length > 0 && activity.status !== "SCHEDULED" && bestTimes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <ViewerTimezoneNote />
        </p>
      )}

      {responses.length === 0 ? (
        <p className="text-muted-foreground">No one has submitted availability yet.</p>
      ) : activity.status === "SCHEDULED" ? (
        <p className="text-muted-foreground">
          This activity has already been scheduled — see the Overview tab.
        </p>
      ) : bestTimes.length === 0 ? (
        <p className="text-muted-foreground">
          No time slot works for anyone yet across the whole search window.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bestTimes.map((window, i) => (
            <Card key={i}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-medium">
                    <LocalRange
                      startIso={window.start.toISOString()}
                      endIso={window.end.toISOString()}
                      dateFormat="EEEE, MMM d, h:mm a"
                    />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {window.score} of {members.length} free:{" "}
                    {window.freeUserIds.map((id) => userNameById.get(id) ?? "Someone").join(", ")}
                  </p>
                </div>
                {isOrganizer && (
                  <ScheduleButton
                    activityId={activity.id}
                    chosenStart={window.start.toISOString()}
                    chosenEnd={window.end.toISOString()}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
