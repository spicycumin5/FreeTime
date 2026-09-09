"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePartyMembership, requireActivityAccess } from "@/lib/actions/guards";
import {
  createActivitySchema,
  submitAvailabilitySchema,
  scheduleActivitySchema,
} from "@/lib/validation/schemas";
import { dateOnlyToUtcMidnight } from "@/lib/scheduling/grid";
import { createCalendarEvent } from "@/lib/google/calendar";

export async function createActivity(partyId: string, formData: FormData) {
  const { session } = await requirePartyMembership(partyId);

  const parsed = createActivitySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    type: formData.get("type"),
    rangeStart: formData.get("rangeStart"),
    rangeEnd: formData.get("rangeEnd"),
    dailyWindowStartMinute: formData.get("dailyWindowStartMinute"),
    dailyWindowEndMinute: formData.get("dailyWindowEndMinute"),
    slotGranularityMinutes: formData.get("slotGranularityMinutes") || undefined,
    durationMinutes: formData.get("durationMinutes") || undefined,
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid activity details");
  }
  const data = parsed.data;

  const activity = await prisma.activity.create({
    data: {
      partyId,
      createdById: session.user.id,
      title: data.title,
      description: data.description || null,
      type: data.type,
      rangeStart: dateOnlyToUtcMidnight(data.rangeStart, data.timezone),
      rangeEnd: dateOnlyToUtcMidnight(data.rangeEnd, data.timezone),
      dailyWindowStartMinute: data.dailyWindowStartMinute,
      dailyWindowEndMinute: data.dailyWindowEndMinute,
      slotGranularityMinutes: data.slotGranularityMinutes,
      durationMinutes: data.durationMinutes,
      timezone: data.timezone,
    },
  });

  redirect(`/activities/${activity.id}/availability`);
}

export async function submitAvailability(input: {
  activityId: string;
  slots: { startsAt: string; endsAt: string }[];
}) {
  const parsed = submitAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid availability");
  }
  const { session, activity } = await requireActivityAccess(parsed.data.activityId);

  await prisma.$transaction(async (tx) => {
    const response = await tx.availabilityResponse.upsert({
      where: {
        activityId_userId: { activityId: activity.id, userId: session.user.id },
      },
      update: {},
      create: { activityId: activity.id, userId: session.user.id },
    });

    await tx.availabilitySlot.deleteMany({
      where: { availabilityResponseId: response.id },
    });

    if (parsed.data.slots.length > 0) {
      await tx.availabilitySlot.createMany({
        data: parsed.data.slots.map((slot) => ({
          availabilityResponseId: response.id,
          startsAt: new Date(slot.startsAt),
          endsAt: new Date(slot.endsAt),
        })),
      });
    }
  });

  revalidatePath(`/activities/${activity.id}/availability`);
  revalidatePath(`/activities/${activity.id}/results`);
}

export async function scheduleActivity(input: {
  activityId: string;
  chosenStart: string;
  chosenEnd: string;
}) {
  const parsed = scheduleActivitySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid schedule request");
  }
  const { session, activity } = await requireActivityAccess(parsed.data.activityId);

  if (activity.createdById !== session.user.id) {
    throw new Error("Only the person who proposed this activity can finalize the time.");
  }
  if (!session.accessToken) {
    throw new Error(
      "Your Google session doesn't have a valid access token. Try signing out and back in.",
    );
  }

  const party = await prisma.party.findUniqueOrThrow({
    where: { id: activity.partyId },
    include: { members: { include: { user: true } } },
  });
  const attendeeEmails = party.members
    .map((m) => m.user.email)
    .filter((email): email is string => Boolean(email));

  const { googleEventId, googleCalendarLink } = await createCalendarEvent({
    accessToken: session.accessToken,
    title: activity.title,
    description: activity.description ?? undefined,
    start: new Date(parsed.data.chosenStart),
    end: new Date(parsed.data.chosenEnd),
    timezone: activity.timezone,
    attendeeEmails,
  });

  await prisma.$transaction([
    prisma.scheduledEvent.create({
      data: {
        activityId: activity.id,
        chosenStart: new Date(parsed.data.chosenStart),
        chosenEnd: new Date(parsed.data.chosenEnd),
        googleEventId,
        googleCalendarLink,
        createdById: session.user.id,
      },
    }),
    prisma.activity.update({
      where: { id: activity.id },
      data: { status: "SCHEDULED" },
    }),
  ]);

  revalidatePath(`/activities/${activity.id}`);
  revalidatePath(`/activities/${activity.id}/results`);
}
