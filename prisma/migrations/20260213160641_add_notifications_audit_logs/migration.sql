-- AlterTable: Update Notification schema (table already exists from previous migration)
-- Only proceed if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Notification') THEN
        ALTER TABLE "Notification" 
            ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false,
            ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "relatedId" TEXT,
            ADD COLUMN IF NOT EXISTS "relatedType" TEXT;
    END IF;
END $$;

-- Migrate isRead to read if column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'isRead') THEN
        UPDATE "Notification" SET "read" = "isRead" WHERE "isRead" IS NOT NULL;
        ALTER TABLE "Notification" DROP COLUMN "isRead";
    END IF;
END $$;

-- Drop old index if exists
DROP INDEX IF EXISTS "Notification_userId_isRead_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- AlterTable: Update AuditLog schema (table already exists from previous migration)
-- Only proceed if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AuditLog') THEN
        ALTER TABLE "AuditLog"
            ADD COLUMN IF NOT EXISTS "entity" TEXT,
            ADD COLUMN IF NOT EXISTS "entityId" TEXT,
            ADD COLUMN IF NOT EXISTS "userName" TEXT,
            ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
    END IF;
END $$;

-- Migrate resource/resourceId to entity/entityId if columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'resource') THEN
        UPDATE "AuditLog" SET "entity" = "resource" WHERE "resource" IS NOT NULL;
        ALTER TABLE "AuditLog" DROP COLUMN "resource";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'resourceId') THEN
        UPDATE "AuditLog" SET "entityId" = "resourceId" WHERE "resourceId" IS NOT NULL;
        ALTER TABLE "AuditLog" DROP COLUMN "resourceId";
    END IF;
END $$;

-- Make entity and entityId required after migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'entity' AND is_nullable = 'YES') THEN
        UPDATE "AuditLog" SET "entity" = '' WHERE "entity" IS NULL;
        ALTER TABLE "AuditLog" ALTER COLUMN "entity" SET NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AuditLog' AND column_name = 'entityId' AND is_nullable = 'YES') THEN
        UPDATE "AuditLog" SET "entityId" = '' WHERE "entityId" IS NULL;
        ALTER TABLE "AuditLog" ALTER COLUMN "entityId" SET NOT NULL;
    END IF;
END $$;

-- Drop old indexes if exist
DROP INDEX IF EXISTS "AuditLog_resource_resourceId_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
