import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyDatabaseConnection() {
  console.log('[Database Test] Initializing Prisma Client...');
  
  if (!process.env.DATABASE_URL) {
    console.error('[Database Test] Error: DATABASE_URL is not defined in your environment variables.');
    process.exit(1);
  }

  // Instantiate client using configured environment DATABASE_URL
  const prisma = new PrismaClient();

  try {
    console.log('[Database Test] Attempting to send "SELECT 1" ping query to PostgreSQL...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Database Test] Connection SUCCESSFUL: Prisma client is connected to the database.');
  } catch (error: any) {
    console.error('[Database Test] Connection FAILED: Check database status and connection settings.');
    console.error('[Database Test] Error message:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseConnection();
