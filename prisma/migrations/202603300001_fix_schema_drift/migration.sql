-- Fix schema drift and add missing columns

-- Add isInstant column to Meeting table
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "isInstant" BOOLEAN NOT NULL DEFAULT false;

-- Drop transcription column from MeetingRecording (removed from schema)
ALTER TABLE "MeetingRecording" DROP COLUMN IF EXISTS "transcription";

-- Drop StandupEntry table (removed from schema)
DROP TABLE IF EXISTS "StandupEntry";

-- Remove waitingRoom column from MeetingParticipant (removed from schema)
ALTER TABLE "MeetingParticipant" DROP COLUMN IF EXISTS "waitingRoom";
