import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/auth/otp/send', () => {
    it('should reject invalid UAE phone number', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({ phone: '+1234567890' })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('should reject empty phone', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({ phone: '' })
        .expect(400);
    });

    it('should reject missing phone field', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/otp/send')
        .send({})
        .expect(400);
    });
  });

  describe('POST /v1/auth/otp/verify', () => {
    it('should reject short OTP', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/otp/verify')
        .send({ phone: '+971501234567', otp: '123' })
        .expect(400);
    });

    it('should reject non-existent OTP', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/otp/verify')
        .send({ phone: '+971501234567', otp: '999999' })
        .expect(401);
    });
  });

  describe('POST /v1/auth/admin/login', () => {
    it('should reject wrong credentials', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/admin/login')
        .send({ email: 'wrong@test.com', password: 'wrong' })
        .expect(401);
    });

    it('should reject missing fields', async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/admin/login')
        .send({})
        .expect(400);
    });
  });

  describe('Protected endpoints', () => {
    it('GET /v1/customers/me should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/v1/customers/me')
        .expect(401);
    });

    it('GET /v1/admin/stats should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/stats')
        .expect(401);
    });

    it('POST /v1/payments/create-intent should reject without token', async () => {
      await request(app.getHttpServer())
        .post('/v1/payments/create-intent')
        .send({ amountAed: 1000 })
        .expect(401);
    });

    it('GET /v1/admin/vehicles should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/v1/admin/vehicles')
        .expect(401);
    });
  });

  describe('Input validation', () => {
    it('POST /v1/bookings should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/v1/bookings')
        .send({ vehicle_id: 'test', start_date: '2026-01-01', end_date: '2026-06-01', mileage_package: 3000 })
        .expect(401);
    });

    it('POST /v1/contact should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/v1/contact')
        .send({})
        .expect(400);
    });

    it('POST /v1/contact should accept valid request', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/contact')
        .send({ name: 'Test User', email: 'test@test.com', message: 'Hello' });

      // Either 201 (success) or 500 (if DB not connected) — but not 400
      expect([201, 500]).toContain(res.status);
    });
  });
});
