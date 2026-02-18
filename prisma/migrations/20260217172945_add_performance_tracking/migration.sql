-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_channelId_fkey";

-- DropForeignKey
ALTER TABLE "MessageRead" DROP CONSTRAINT "MessageRead_messageId_fkey";

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "transcript" TEXT;

-- CreateTable
CREATE TABLE "DriveEntry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL DEFAULT '/',
    "isFolder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "DriveEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveFileVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entryId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "DriveFileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerFeedback" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "PeerFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkHours" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hours" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT,

    CONSTRAINT "WorkHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DriveEntry_teamId_path_name_idx" ON "DriveEntry"("teamId", "path", "name");

-- CreateIndex
CREATE INDEX "DriveFileVersion_entryId_idx" ON "DriveFileVersion"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "DriveFileVersion_entryId_version_key" ON "DriveFileVersion"("entryId", "version");

-- CreateIndex
CREATE INDEX "PeerFeedback_receiverId_idx" ON "PeerFeedback"("receiverId");

-- CreateIndex
CREATE INDEX "PeerFeedback_giverId_idx" ON "PeerFeedback"("giverId");

-- CreateIndex
CREATE INDEX "PeerFeedback_teamId_idx" ON "PeerFeedback"("teamId");

-- CreateIndex
CREATE INDEX "PeerFeedback_createdAt_idx" ON "PeerFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "WorkHours_userId_idx" ON "WorkHours"("userId");

-- CreateIndex
CREATE INDEX "WorkHours_date_idx" ON "WorkHours"("date");

-- CreateIndex
CREATE INDEX "WorkHours_teamId_idx" ON "WorkHours"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkHours_userId_date_key" ON "WorkHours"("userId", "date");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveEntry" ADD CONSTRAINT "DriveEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveEntry" ADD CONSTRAINT "DriveEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFileVersion" ADD CONSTRAINT "DriveFileVersion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DriveEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveFileVersion" ADD CONSTRAINT "DriveFileVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerFeedback" ADD CONSTRAINT "PeerFeedback_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerFeedback" ADD CONSTRAINT "PeerFeedback_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerFeedback" ADD CONSTRAINT "PeerFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkHours" ADD CONSTRAINT "WorkHours_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkHours" ADD CONSTRAINT "WorkHours_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
