-- CreateTable
CREATE TABLE "MeetingReminder" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingReminder_meetingId_idx" ON "MeetingReminder"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingReminder_userId_idx" ON "MeetingReminder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingReminder_meetingId_userId_minutesBefore_key" ON "MeetingReminder"("meetingId", "userId", "minutesBefore");

-- AddForeignKey
ALTER TABLE "MeetingReminder" ADD CONSTRAINT "MeetingReminder_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
