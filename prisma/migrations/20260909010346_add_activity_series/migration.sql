-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "seriesId" TEXT;

-- CreateTable
CREATE TABLE "ActivitySeries" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ActivityType" NOT NULL,
    "dailyWindowStartMinute" INTEGER NOT NULL,
    "dailyWindowEndMinute" INTEGER NOT NULL,
    "slotGranularityMinutes" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "searchWindowDays" INTEGER NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivitySeries_active_nextRunAt_idx" ON "ActivitySeries"("active", "nextRunAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ActivitySeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySeries" ADD CONSTRAINT "ActivitySeries_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivitySeries" ADD CONSTRAINT "ActivitySeries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
