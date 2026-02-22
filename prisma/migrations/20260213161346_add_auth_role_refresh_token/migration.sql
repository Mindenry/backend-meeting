-- AlterTable: Add password and role if they don't exist (may already exist from previous migration)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Update role column if it exists, or add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role') THEN
        ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';
    ELSE
        -- Update default if column exists but default is different
        ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'member';
    END IF;
END $$;

-- CreateTable: RefreshToken (use IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");

-- AddForeignKey (drop first if exists to avoid errors)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'RefreshToken_userId_fkey' 
               AND table_name = 'RefreshToken') THEN
        ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";
    END IF;
END $$;

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
