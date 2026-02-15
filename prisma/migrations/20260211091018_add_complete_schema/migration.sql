-- CreateTable: Organization
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "allowedDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- Create default organization
DO $$
DECLARE
    default_org_id TEXT;
BEGIN
    -- Check if organization already exists
    SELECT id INTO default_org_id FROM "Organization" LIMIT 1;
    
    -- If no organization exists, create one
    IF default_org_id IS NULL THEN
        -- Generate a simple ID
        default_org_id := 'default-org-' || EXTRACT(EPOCH FROM NOW())::bigint::text || '-' || 
                          LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
        
        INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
        VALUES (default_org_id, 'Default Organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    END IF;
    
    -- Add organizationId to User (nullable first)
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'employee';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    
    -- Update existing users with default organization
    UPDATE "User" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
    
    -- Make organizationId required
    ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
    
    -- Add organizationId to Team (nullable first)
    ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
    ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "description" TEXT;
    
    -- Update existing teams with default organization
    UPDATE "Team" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
    
    -- Make organizationId required
    ALTER TABLE "Team" ALTER COLUMN "organizationId" SET NOT NULL;
    
    -- Add meetingCode to Meeting (nullable first, then generate)
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "meetingCode" TEXT;
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "endTime" TIMESTAMP(3);
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT false;
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "actualStartTime" TIMESTAMP(3);
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "actualEndTime" TIMESTAMP(3);
    ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "summary" TEXT;
    
    -- Generate meeting codes for existing meetings (9 character alphanumeric)
    UPDATE "Meeting" 
    SET "meetingCode" = UPPER(
        SUBSTRING(
            MD5(RANDOM()::TEXT || id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT) 
            FROM 1 FOR 9
        )
    )
    WHERE "meetingCode" IS NULL;
    
    -- Ensure uniqueness (if duplicates exist, regenerate)
    UPDATE "Meeting" m1
    SET "meetingCode" = UPPER(
        SUBSTRING(
            MD5(RANDOM()::TEXT || m1.id::TEXT || EXTRACT(EPOCH FROM NOW())::TEXT || m1."meetingCode") 
            FROM 1 FOR 9
        )
    )
    WHERE EXISTS (
        SELECT 1 FROM "Meeting" m2 
        WHERE m2.id != m1.id AND m2."meetingCode" = m1."meetingCode"
    );
    
    -- Make meetingCode required and unique
    ALTER TABLE "Meeting" ALTER COLUMN "meetingCode" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "Meeting_meetingCode_key" ON "Meeting"("meetingCode");
    
    -- Add foreign key constraints
    ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
END $$;

-- CreateTable: Invite
CREATE TABLE IF NOT EXISTS "Invite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'employee',
    "teamId" TEXT,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE INDEX IF NOT EXISTS "Invite_token_idx" ON "Invite"("token");
CREATE INDEX IF NOT EXISTS "Invite_email_idx" ON "Invite"("email");

-- CreateTable: MeetingParticipant
CREATE TABLE IF NOT EXISTS "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "handRaised" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "isVideoOn" BOOLEAN NOT NULL DEFAULT false,
    "isSharing" BOOLEAN NOT NULL DEFAULT false,
    "waitingRoom" BOOLEAN NOT NULL DEFAULT true,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MeetingParticipant_meetingId_userId_key" ON "MeetingParticipant"("meetingId", "userId");
CREATE INDEX IF NOT EXISTS "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateTable: TaskComment
CREATE TABLE IF NOT EXISTS "TaskComment" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TaskActivityLog
CREATE TABLE IF NOT EXISTS "TaskActivityLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "TaskActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MessageRead
CREATE TABLE IF NOT EXISTS "MessageRead" (
    "id" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageRead_messageId_userId_key" ON "MessageRead"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "MessageRead_userId_messageId_idx" ON "MessageRead"("userId", "messageId");

-- CreateTable: AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey: Invite
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: MeetingParticipant
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Notification
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: TaskComment
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: TaskActivityLog
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskActivityLog" ADD CONSTRAINT "TaskActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: MessageRead
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageRead" ADD CONSTRAINT "MessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: AuditLog
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

