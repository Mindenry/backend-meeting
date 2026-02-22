/*
  Warnings:

  - You are about to drop the column `backupCodes` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorEnabled` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `twoFactorSecret` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `PeerFeedbackReview` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceReview` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey (only if tables exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='PeerFeedbackReview') THEN
        ALTER TABLE "PeerFeedbackReview" DROP CONSTRAINT IF EXISTS "PeerFeedbackReview_giverId_fkey";
        ALTER TABLE "PeerFeedbackReview" DROP CONSTRAINT IF EXISTS "PeerFeedbackReview_reviewId_fkey";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='PerformanceReview') THEN
        ALTER TABLE "PerformanceReview" DROP CONSTRAINT IF EXISTS "PerformanceReview_reviewerId_fkey";
        ALTER TABLE "PerformanceReview" DROP CONSTRAINT IF EXISTS "PerformanceReview_userId_fkey";
    END IF;
END $$;

-- Note: 2FA columns removed - not needed for now

-- DropTable (only if tables exist)
DROP TABLE IF EXISTS "PeerFeedbackReview";
DROP TABLE IF EXISTS "PerformanceReview";
