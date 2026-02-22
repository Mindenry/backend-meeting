-- Remove 2FA fields from User table (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='twoFactorEnabled') THEN
        ALTER TABLE "User" DROP COLUMN "twoFactorEnabled";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='twoFactorSecret') THEN
        ALTER TABLE "User" DROP COLUMN "twoFactorSecret";
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='backupCodes') THEN
        ALTER TABLE "User" DROP COLUMN "backupCodes";
    END IF;
END $$;
