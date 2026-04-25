import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface DatabaseCheck {
  status: 'up' | 'down';
  latencyMs?: number;
}

export interface MemoryCheck {
  status: 'ok' | 'warning';
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: DatabaseCheck;
    memory: MemoryCheck;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkMemory(),
    ]);

    const status =
      database.status === 'down'
        ? 'unhealthy'
        : memory.status === 'warning'
          ? 'degraded'
          : 'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
      checks: { database, memory },
    };
  }

  private async checkDatabase(): Promise<DatabaseCheck> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error('Database health check failed', err);
      return { status: 'down', latencyMs: Date.now() - start };
    }
  }

  private checkMemory(): MemoryCheck {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);

    // Warn if heap usage exceeds 512 MB
    const status = heapUsedMB > 512 ? 'warning' : 'ok';

    return { status, heapUsedMB, heapTotalMB, rssMB };
  }
}
