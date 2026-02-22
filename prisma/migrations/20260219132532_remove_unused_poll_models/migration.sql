-- DropForeignKey
ALTER TABLE "Poll" DROP CONSTRAINT IF EXISTS "Poll_channelId_fkey";
ALTER TABLE "Poll" DROP CONSTRAINT IF EXISTS "Poll_createdBy_fkey";
ALTER TABLE "PollVote" DROP CONSTRAINT IF EXISTS "PollVote_pollId_fkey";
ALTER TABLE "PollVote" DROP CONSTRAINT IF EXISTS "PollVote_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Poll_channelId_idx";
DROP INDEX IF EXISTS "Poll_isActive_idx";
DROP INDEX IF EXISTS "PollVote_pollId_idx";
DROP INDEX IF EXISTS "PollVote_pollId_userId_key";

-- DropTable
DROP TABLE IF EXISTS "PollVote";
DROP TABLE IF EXISTS "Poll";
