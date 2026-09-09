import { notFound } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { joinParty } from "@/lib/actions/parties";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const party = await prisma.party.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });
  if (!party) notFound();

  const session = await auth();

  return (
    <div className="flex justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>You&apos;re invited to {party.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {party._count.members} member{party._count.members === 1 ? "" : "s"} so far.
          </p>

          {session?.user ? (
            <form action={joinParty.bind(null, code)}>
              <Button type="submit" className="w-full">
                Join party
              </Button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: `/invite/${code}` });
              }}
            >
              <Button type="submit" className="w-full">
                Sign in to join
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
