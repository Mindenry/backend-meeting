-- CreateTable
CREATE TABLE "StandupEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rawText" TEXT NOT NULL,
    "yesterday" TEXT[],
    "today" TEXT[],
    "blockers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandupEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandupEntry_teamId_date_idx" ON "StandupEntry"("teamId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StandupEntry_userId_teamId_date_key" ON "StandupEntry"("userId", "teamId", "date");

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandupEntry" ADD CONSTRAINT "StandupEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
