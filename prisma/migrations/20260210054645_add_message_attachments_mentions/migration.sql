-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[];
