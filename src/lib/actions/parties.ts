"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/actions/guards";
import { createPartySchema } from "@/lib/validation/schemas";

export async function createParty(formData: FormData) {
  const session = await requireSession();

  const parsed = createPartySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid party name");
  }

  const party = await prisma.party.create({
    data: {
      name: parsed.data.name,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  redirect(`/parties/${party.id}`);
}

export async function joinParty(inviteCode: string) {
  const session = await requireSession();

  const party = await prisma.party.findUnique({ where: { inviteCode } });
  if (!party) throw new Error("This invite link is invalid or has expired.");

  await prisma.partyMember.upsert({
    where: { partyId_userId: { partyId: party.id, userId: session.user.id } },
    update: {},
    create: { partyId: party.id, userId: session.user.id, role: "MEMBER" },
  });

  revalidatePath(`/parties/${party.id}`);
  redirect(`/parties/${party.id}`);
}
