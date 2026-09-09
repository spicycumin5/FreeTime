import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createParty } from "@/lib/actions/parties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Movie Night</h1>
        <p className="max-w-md text-muted-foreground">
          Propose an activity, let everyone mark when they&apos;re free, and get the best
          overlapping time scheduled straight to Google Calendar. Sign in to get started.
        </p>
      </div>
    );
  }

  const memberships = await prisma.partyMember.findMany({
    where: { userId: session.user.id },
    include: {
      party: {
        include: { _count: { select: { members: true, activities: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your parties</h1>
        <p className="text-muted-foreground">Groups you schedule activities with.</p>
      </div>

      {memberships.length === 0 ? (
        <p className="text-muted-foreground">
          You&apos;re not in any parties yet. Create one below.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <Link key={m.party.id} href={`/parties/${m.party.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle>{m.party.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {m.party._count.members} member
                  {m.party._count.members === 1 ? "" : "s"} &middot;{" "}
                  {m.party._count.activities} activit
                  {m.party._count.activities === 1 ? "y" : "ies"}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card className="max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Create a party</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createParty} className="flex gap-2">
            <Input name="name" placeholder="e.g. Friday Regulars" required maxLength={100} />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
