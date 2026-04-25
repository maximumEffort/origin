import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { TwilioService } from '../integrations/twilio/twilio.service';
import { SendGridService, EmailLanguage } from '../integrations/sendgrid/sendgrid.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly twilio: TwilioService,
    private readonly sendGrid: SendGridService,
  ) {}

  /** Hash an OTP with SHA-256 so plaintext is never stored. */
  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  async sendOtp(phone: string): Promise<{ message: string; expires_in: number }> {
    const uaePhoneRegex = /^\+971[0-9]{8,9}$/;
    if (!uaePhoneRegex.test(phone)) {
      throw new BadRequestException(
        'Phone number must be a valid UAE number (+971XXXXXXXXX)',
      );
    }

    const twilioConfigured = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!twilioConfigured) {
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(
          'SMS service is not configured. Please contact support.',
        );
      }

      // Dev mode only: generate our own OTP and store in DB
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await this.prisma.otpCode.deleteMany({ where: { phone } });
      await this.prisma.otpCode.create({
        data: { phone, otpHash: this.hashOtp(otp), expiresAt },
      });

      // Only log OTP in development — never in production
      Logger.debug(`[OTP] Code for ${phone}: ${otp}`, 'AuthService');
    } else {
      // Production: use Twilio Verify (it generates and sends its own code)
      await this.twilio.sendOtp(phone);
    }

    return { message: 'OTP sent successfully', expires_in: 300 };
  }

  async verifyOtp(phone: string, otp: string) {
    const twilioConfigured = !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!twilioConfigured) {
      // Dev/fallback mode: verify against DB-stored hash
      const stored = await this.prisma.otpCode.findFirst({
        where: { phone, verified: false, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!stored) {
        throw new UnauthorizedException(
          'No OTP found for this number. Please request a new one.',
        );
      }

      if (stored.otpHash !== this.hashOtp(otp)) {
        throw new UnauthorizedException('Invalid OTP.');
      }

      await this.prisma.otpCode.delete({ where: { id: stored.id } });
    } else {
      // Production: verify via Twilio Verify
      const valid = await this.twilio.verifyOtp(phone, otp);
      if (!valid) {
        throw new UnauthorizedException('Invalid OTP.');
      }
    }

    // Find or create customer
    let customer = await this.prisma.customer.findUnique({ where: { phone } });
    const isNewCustomer = !customer;
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { phone, fullName: '' },
      });
    }

    // Send welcome email to new customers (non-blocking)
    if (isNewCustomer && customer.email) {
      void this.sendGrid.sendWelcome(
        customer.email,
        { firstName: customer.fullName || 'there' },
        (customer.preferredLanguage as EmailLanguage) ?? 'en',
      );
    }

    const tokens = this.generateTokens(customer.id, 'customer');
    return {
      ...tokens,
      customer: {
        id: customer.id,
        phone: customer.phone,
        fullName: customer.fullName,
        kycStatus: customer.kycStatus,
        preferredLanguage: customer.preferredLanguage,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const secret =
        this.config.get<string>('JWT_REFRESH_SECRET') ??
        this.config.get<string>('JWT_SECRET');
      const payload = this.jwt.verify(refreshToken, { secret });
      return this.generateTokens(payload.sub, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async adminLogin(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });

    // Use constant-time comparison to prevent timing attacks even when user not found
    const dummyHash = '$2b$12$invalidhashfortimingattackprevention000000000000000000000';
    const hashToCheck = admin?.password ?? dummyHash;
    const passwordValid = await bcrypt.compare(password, hashToCheck);

    if (!admin || !admin.isActive || !passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = this.generateTokens(admin.id, admin.role);
    return {
      ...tokens,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    };
  }

  private generateTokens(sub: string, role: string) {
    const payload = { sub, role };
    const refreshSecret =
      this.config.get<string>('JWT_REFRESH_SECRET') ??
      this.config.get<string>('JWT_SECRET');
    return {
      access_token: this.jwt.sign(payload),
      refresh_token: this.jwt.sign(payload, {
        secret: refreshSecret,
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    };
  }
}
