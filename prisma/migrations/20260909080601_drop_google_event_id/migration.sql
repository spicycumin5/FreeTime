/*
  Warnings:

  - You are about to drop the column `googleEventId` on the `ScheduledEvent` table. All the data in the column will be lost.
  - Made the column `googleCalendarLink` on table `ScheduledEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ScheduledEvent" DROP COLUMN "googleEventId",
ALTER COLUMN "googleCalendarLink" SET NOT NULL;
