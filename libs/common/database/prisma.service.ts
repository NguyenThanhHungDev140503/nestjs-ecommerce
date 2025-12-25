import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    neonConfig.webSocketConstructor = ws;
    const connectionString = process.env.DATABASE_URL;
    

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('DEBUG: PrismaService connectionString:', connectionString.substring(0, 20) + '...');
    // Debug connection details
    try {
      const url = new URL(connectionString);
      console.log('DEBUG: Parsed Host:', url.hostname);
    } catch (e) {
      console.log('DEBUG: Failed to parse URL:', e.message);
    }

    // const pool = new Pool({ connectionString }); // Pool is handled internally by adapter in v7 with connectionString
    const adapter = new PrismaNeon({ connectionString });

    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

