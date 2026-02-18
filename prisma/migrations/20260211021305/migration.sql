-- Ensure Meeting has isLocked column before making it required
ALTER TABLE "Meeting"
ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;

-- Allow endTime to be nullable
ALTER TABLE "Meeting"
ALTER COLUMN "endTime" DROP NOT NULL;

-- Ensure User's role and isActive columns exist and are non-nullable with defaults
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'employee',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
