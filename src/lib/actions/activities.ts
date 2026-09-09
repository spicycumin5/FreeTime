"use server";

import { addMonths, addWeeks } from "date-fns";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  requirePartyMembership,
  requireActivityAccess,
  requirePartyRole,
  requireSession,
} from "@/lib/actions/guards";
import {
  createActivitySchema,
  submitAvailabilitySchema,
  scheduleActivitySchema,
} from "@/lib/validation/schemas";
import { dateOnlyToUtcMidnight, differenceInDaysDateOnly } from "@/lib/scheduling/grid";
import { buildGoogleCalendarLink } from "@/lib/google/calendar";

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

  const activityFields = {
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
  };

  let activityId: string;

  if (data.repeat === "NONE") {
    const activity = await prisma.activity.create({ data: activityFields });
    activityId = activity.id;
  } else {
    const frequency = data.repeat;
    const searchWindowDays = Math.max(
      1,
      differenceInDaysDateOnly(data.rangeStart, data.rangeEnd) + 1,
    );
    const nextRunAt =
      frequency === "WEEKLY"
        ? addWeeks(activityFields.rangeStart, 1)
        : addMonths(activityFields.rangeStart, 1);

    const activity = await prisma.$transaction(async (tx) => {
      const series = await tx.activitySeries.create({
        data: {
          partyId,
          createdById: session.user.id,
          title: data.title,
          description: data.description || null,
          type: data.type,
          dailyWindowStartMinute: data.dailyWindowStartMinute,
          dailyWindowEndMinute: data.dailyWindowEndMinute,
          slotGranularityMinutes: data.slotGranularityMinutes,
          durationMinutes: data.durationMinutes,
          timezone: data.timezone,
          searchWindowDays,
          frequency,
          nextRunAt,
        },
      });
      return tx.activity.create({ data: { ...activityFields, seriesId: series.id } });
    });
    activityId = activity.id;
  }

  redirect(`/activities/${activityId}/availability`);
}

export async function stopActivitySeries(seriesId: string) {
  const session = await requireSession();

  const series = await prisma.activitySeries.findUnique({ where: { id: seriesId } });
  if (!series) throw new Error("Recurring series not found.");

  if (series.createdById !== session.user.id) {
    await requirePartyRole(series.partyId, "OWNER");
  }

  await prisma.activitySeries.update({ where: { id: seriesId }, data: { active: false } });
  revalidatePath(`/parties/${series.partyId}`);
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

  const party = await prisma.party.findUniqueOrThrow({
    where: { id: activity.partyId },
    include: { members: { include: { user: true } } },
  });
  const attendeeEmails = party.members
    .map((m) => m.user.email)
    .filter((email): email is string => Boolean(email));

  const googleCalendarLink = buildGoogleCalendarLink({
    title: activity.title,
    description: activity.description ?? undefined,
    start: new Date(parsed.data.chosenStart),
    end: new Date(parsed.data.chosenEnd),
    attendeeEmails,
  });

  await prisma.$transaction([
    prisma.scheduledEvent.create({
      data: {
        activityId: activity.id,
        chosenStart: new Date(parsed.data.chosenStart),
        chosenEnd: new Date(parsed.data.chosenEnd),
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
