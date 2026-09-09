import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../src/lib/prisma-adapter";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter(process.env.DATABASE_URL),
});

async function main() {
  const [alice, bob, carol] = await Promise.all(
    ["Alice", "Bob", "Carol"].map((name) =>
      prisma.user.upsert({
        where: { email: `${name.toLowerCase()}@example.test` },
        update: {},
        create: { name, email: `${name.toLowerCase()}@example.test` },
      }),
    ),
  );

  const party = await prisma.party.upsert({
    where: { inviteCode: "seed-party" },
    update: {},
    create: {
      name: "Seed Test Party",
      inviteCode: "seed-party",
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "MEMBER" },
          { userId: carol.id, role: "MEMBER" },
        ],
      },
    },
  });

  const rangeStart = new Date();
  rangeStart.setUTCHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const activity = await prisma.activity.create({
    data: {
      partyId: party.id,
      createdById: alice.id,
      title: "Seed Movie Night",
      type: "MOVIE_NIGHT",
      rangeStart,
      rangeEnd,
      dailyWindowStartMinute: 18 * 60,
      dailyWindowEndMinute: 23 * 60,
      slotGranularityMinutes: 30,
      durationMinutes: 120,
      timezone: "UTC",
    },
  });

  function slot(dayOffset: number, hour: number, minute = 0) {
    const d = new Date(rangeStart);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(hour, minute, 0, 0);
    return d;
  }

  await prisma.availabilityResponse.create({
    data: {
      activityId: activity.id,
      userId: alice.id,
      slots: { create: [{ startsAt: slot(0, 19), endsAt: slot(0, 21) }] },
    },
  });
  await prisma.availabilityResponse.create({
    data: {
      activityId: activity.id,
      userId: bob.id,
      slots: { create: [{ startsAt: slot(0, 19), endsAt: slot(0, 22) }] },
    },
  });
  await prisma.availabilityResponse.create({
    data: {
      activityId: activity.id,
      userId: carol.id,
      slots: { create: [{ startsAt: slot(1, 18), endsAt: slot(1, 20) }] },
    },
  });

  await prisma.movieSuggestion.create({
    data: {
      activityId: activity.id,
      suggestedById: alice.id,
      title: "The Seed Movie",
    },
  });

  console.log(`Seeded party ${party.id} with activity ${activity.id}.`);
  console.log(`Invite link: /invite/${party.inviteCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
