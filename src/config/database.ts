import { PrismaClient } from '@prisma/client';
import { config } from './index';

class PrismaService {
  private static instance: PrismaService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url,
        },
      },
      log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'colorless',
    });

    // Handle connection events
    this.setupEventHandlers();
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('🔌 Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public async reset(): Promise<void> {
    if (config.nodeEnv === 'production') {
      throw new Error('Cannot reset database in production environment');
    }

    try {
      // Get all table names
      const tables = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `;

      // Disable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = replica;`;

      // Truncate all tables
      for (const table of tables) {
        if (table.tablename !== '_prisma_migrations') {
          await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE;`);
        }
      }

      // Re-enable foreign key checks
      await this.prisma.$executeRaw`SET session_replication_role = DEFAULT;`;

      console.log('🗑️ Database reset successfully');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Handle process exit
    process.on('beforeExit', async () => {
      await this.disconnect();
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }
}

// Export singleton instance
export const prismaService = PrismaService.getInstance();
export const prisma = prismaService.getClient();

// Export types for convenience
export type { PrismaClient } from '@prisma/client';
