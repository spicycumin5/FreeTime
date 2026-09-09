import { addMonths, addWeeks } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addDaysToDateOnly, dateOnlyToUtcMidnight, todayInTimezone } from "@/lib/scheduling/grid";
import { sendActivityReminder } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/url";

/**
 * Daily cron (see vercel.json): spawns a fresh Activity occurrence for every
 * due ActivitySeries and emails the party a reminder to fill in availability.
 * Vercel doesn't guarantee at-most-once cron delivery, so each series is
 * advanced via an optimistic-lock conditional update before doing any work,
 * making a duplicate/overlapping invocation a safe no-op for that series.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dueSeries = await prisma.activitySeries.findMany({
    where: { active: true, nextRunAt: { lte: new Date() } },
    include: { party: { include: { members: { include: { user: true } } } } },
  });

  let succeeded = 0;
  let failed = 0;

  for (const series of dueSeries) {
    try {
      const advancedNextRunAt =
        series.frequency === "WEEKLY"
          ? addWeeks(series.nextRunAt, 1)
          : addMonths(series.nextRunAt, 1);

      const { count } = await prisma.activitySeries.updateMany({
        where: { id: series.id, nextRunAt: series.nextRunAt },
        data: { nextRunAt: advancedNextRunAt },
      });
      if (count !== 1) continue; // another invocation already claimed this series

      const startDateOnly = todayInTimezone(series.timezone);
      const endDateOnly = addDaysToDateOnly(startDateOnly, series.searchWindowDays);

      const activity = await prisma.activity.create({
        data: {
          partyId: series.partyId,
          createdById: series.createdById,
          title: series.title,
          description: series.description,
          type: series.type,
          rangeStart: dateOnlyToUtcMidnight(startDateOnly, series.timezone),
          rangeEnd: dateOnlyToUtcMidnight(endDateOnly, series.timezone),
          dailyWindowStartMinute: series.dailyWindowStartMinute,
          dailyWindowEndMinute: series.dailyWindowEndMinute,
          slotGranularityMinutes: series.slotGranularityMinutes,
          durationMinutes: series.durationMinutes,
          timezone: series.timezone,
          seriesId: series.id,
        },
      });

      const toEmails = series.party.members
        .map((m) => m.user.email)
        .filter((email): email is string => Boolean(email));

      await sendActivityReminder({
        toEmails,
        partyName: series.party.name,
        activityTitle: activity.title,
        activityUrl: `${getAppUrl()}/activities/${activity.id}/availability`,
      });

      await prisma.activity.update({
        where: { id: activity.id },
        data: { reminderSentAt: new Date() },
      });

      succeeded++;
    } catch (error) {
      console.error(`Failed to process ActivitySeries ${series.id}`, error);
      failed++;
    }
  }

  return NextResponse.json({ processed: dueSeries.length, succeeded, failed });
}
