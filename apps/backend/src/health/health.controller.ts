import { Controller, Get, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Full health check with database and memory status' })
  async check(@Res() res: Response) {
    const result = await this.healthService.check();
    const status = result.status === 'unhealthy' ? 503 : 200;
    res.status(status).json(result);
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — confirms the process is running' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString(), deploy: 'acdd30f' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — confirms database connectivity' })
  async ready(@Res() res: Response) {
    const result = await this.healthService.check();
    if (result.checks.database.status === 'down') {
      res.status(503).json({
        status: 'not_ready',
        database: result.checks.database,
      });
      return;
    }
    res.status(200).json({
      status: 'ready',
      database: result.checks.database,
    });
  }
}
