import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Supabase uses pgBouncer on port 6543 in transaction mode.
 * Prisma 5.x requires `?pgbouncer=true&connection_limit=1` to be appended to
 * the DATABASE_URL when using pgBouncer; without these params the connection
 * handshake hangs indefinitely because pgBouncer silently drops prepared-
 * statement negotiation messages.
 *
 * We patch the URL here so the Railway env var doesn't need to be touched.
 */
function buildDatasourceUrl(): string {
  const url = process.env.DATABASE_URL ?? '';
  if (url.includes(':6543/') && !url.includes('pgbouncer=true')) {
    const sep = url.includes('?') ? '&' : '?';
    // connect_timeout=5: abort if TCP/auth handshake takes longer than 5 s
    // (prevents $connect() from hanging when Supabase backend is paused/cold)
    return `${url}${sep}pgbouncer=true&connection_limit=1&connect_timeout=5`;
  }
  return url;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ datasources: { db: { url: buildDatasourceUrl() } } });
  }

  async onModuleInit() {
    // Swallow connection errors on startup so NestJS can start even when the
    // database is temporarily unreachable (e.g. Supabase cold-start, network
    // blip). Prisma will reconnect automatically on the first query.
    try {
      await this.$connect();
    } catch (err) {
      console.error('[PrismaService] Initial connect failed — DB may be unreachable:', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
