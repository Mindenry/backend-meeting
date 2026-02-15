/*
  Warnings:

  - Made the column `isLocked` on table `Meeting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `role` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `isActive` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Meeting" ALTER COLUMN "endTime" DROP NOT NULL,
ALTER COLUMN "isLocked" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "isActive" SET NOT NULL;
