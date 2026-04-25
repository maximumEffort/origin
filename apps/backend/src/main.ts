import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as compression from 'compression';

async function bootstrap() {
  // Validate required environment variables before starting
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is required. ' +
      'The application cannot start without a secure JWT secret.',
    );
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for webhook signature verification
  });

  app.setGlobalPrefix('v1', { exclude: ['health', 'health/live', 'health/ready'] });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(compression());

  // Allow multiple CORS origins (comma-separated in env var)
  // Check both var names for backwards compatibility
  const corsEnv =
    process.env.CORS_ORIGIN ??
    process.env.CORS_ALLOWED_ORIGINS ??
    'http://localhost:3000,http://localhost:3002';

  const allowedOrigins = corsEnv.split(',').map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Car Leasing API')
    .setDescription('REST API — Chinese car leasing platform, Dubai UAE')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication — OTP + JWT')
    .addTag('vehicles', 'Vehicle catalogue and fleet')
    .addTag('calculator', 'Lease quote calculator')
    .addTag('bookings', 'Booking management')
    .addTag('customers', 'Customer profiles and KYC')
    .addTag('leases', 'Active lease management')
    .build();

  // Only expose Swagger docs in non-production
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Car Leasing API running on http://localhost:${port}/v1`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

bootstrap();
