-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activity" TEXT NOT NULL DEFAULT 'Available',
ADD COLUMN     "currentRoom" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'online';
