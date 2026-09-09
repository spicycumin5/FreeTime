import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePartyMembership } from "@/lib/actions/guards";
import { InviteLink } from "@/components/parties/invite-link";
import { NewActivityForm } from "@/components/activities/new-activity-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const STATUS_LABEL: Record<string, string> = {
  COLLECTING_AVAILABILITY: "Collecting availability",
  READY_TO_SCHEDULE: "Ready to schedule",
  SCHEDULED: "Scheduled",
  CANCELED: "Canceled",
};

export default async function PartyPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  await requirePartyMembership(partyId);

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      members: { include: { user: true }, orderBy: { joinedAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!party) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{party.name}</h1>
        <p className="text-muted-foreground">
          {party.members.length} member{party.members.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite friends</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InviteLink inviteCode={party.inviteCode} />
          <div className="flex flex-wrap gap-3">
            {party.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={m.user.image ?? undefined} alt={m.user.name ?? "Member"} />
                  <AvatarFallback>{m.user.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="text-sm">{m.user.name ?? m.user.email}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Activities</h2>
        {party.activities.length === 0 ? (
          <p className="text-muted-foreground">No activities proposed yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {party.activities.map((activity) => (
              <Link key={activity.id} href={`/activities/${activity.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.type === "MOVIE_NIGHT" ? "Movie night" : "Activity"}
                      </p>
                    </div>
                    <Badge variant="secondary">{STATUS_LABEL[activity.status]}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Propose a new activity</CardTitle>
        </CardHeader>
        <CardContent>
          <NewActivityForm partyId={party.id} />
        </CardContent>
      </Card>
    </div>
  );
}
