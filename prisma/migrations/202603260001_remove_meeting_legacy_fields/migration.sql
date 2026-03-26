-- Remove legacy meeting columns no longer present in prisma/schema.prisma
ALTER TABLE "Meeting"
  DROP COLUMN IF EXISTS "password",
  DROP COLUMN IF EXISTS "waitingRoom",
  DROP COLUMN IF EXISTS "isLocked",
  DROP COLUMN IF EXISTS "summary";

-- Remove legacy participant column no longer present in prisma/schema.prisma
ALTER TABLE "MeetingParticipant"
  DROP COLUMN IF EXISTS "waitingRoom";
