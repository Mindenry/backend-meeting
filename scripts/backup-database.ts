import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Database Backup Script
 * Creates a backup of the PostgreSQL database
 */
async function backupDatabase() {
  const prisma = new PrismaClient();
  const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);
  const retentionDays = parseInt(process.env.RETENTION_DAYS || '30', 10);

  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('Starting database backup...');
    console.log(`Backup file: ${backupFile}`);

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create backup using pg_dump
    await execAsync(`pg_dump "${databaseUrl}" > "${backupFile}"`);

    // Compress backup
    await execAsync(`gzip "${backupFile}"`);
    const compressedFile = `${backupFile}.gz`;

    // Get file size
    const stats = fs.statSync(compressedFile);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`Backup completed: ${compressedFile}`);
    console.log(`Backup size: ${fileSizeInMB} MB`);

    // Clean up old backups
    console.log(`Cleaning up backups older than ${retentionDays} days...`);
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.sql.gz')) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (fileAge > retentionDays) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    }

    console.log(`Deleted ${deletedCount} old backup(s)`);
    console.log('Backup process completed successfully');
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run backup
backupDatabase();
