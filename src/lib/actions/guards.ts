import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

export async function requireSession(): Promise<Session & { user: { id: string } }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session as Session & { user: { id: string } };
}

export async function requirePartyMembership(partyId: string) {
  const session = await requireSession();

  const membership = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId, userId: session.user.id } },
  });
  if (!membership) throw new Error("You are not a member of this party.");

  return { session, membership };
}

export async function requireActivityAccess(activityId: string) {
  const session = await requireSession();

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new Error("Activity not found.");

  const membership = await prisma.partyMember.findUnique({
    where: { partyId_userId: { partyId: activity.partyId, userId: session.user.id } },
  });
  if (!membership) throw new Error("You are not a member of this party.");

  return { session, activity, membership };
}
