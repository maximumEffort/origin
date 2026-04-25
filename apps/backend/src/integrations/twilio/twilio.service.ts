import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const twilio = require('twilio') as typeof import('twilio');

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: ReturnType<typeof twilio> | null;
  private readonly fromNumber: string;
  private readonly verifyServiceSid: string;

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER', '');
    this.verifyServiceSid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID', '');

    if (accountSid && authToken && accountSid.startsWith('AC')) {
      this.client = twilio(accountSid, authToken);
      this.logger.log('Twilio client initialised');
    } else {
      this.client = null;
      this.logger.warn('Twilio credentials not configured — SMS/OTP will be unavailable');
    }
  }

  /**
   * Send OTP via Twilio Verify.
   * Recommended over manual OTP — handles retries, rate-limiting, and fraud detection.
   * UAE numbers must include country code: +971XXXXXXXXX
   */
  async sendOtp(phone: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`Twilio not configured — cannot send OTP to ${phone}`);
      throw new BadRequestException('SMS service is not configured');
    }

    const to = this.normalisePhone(phone);

    try {
      await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({ to, channel: 'sms' });

      this.logger.log(`OTP sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`OTP send failed for ${to}: ${err.message}`);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify the OTP code entered by the user.
   * Returns true if valid, false if wrong/expired.
   */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    if (!this.client) return false;

    const to = this.normalisePhone(phone);

    try {
      this.logger.log(`Verifying OTP for ${to} with service ${this.verifyServiceSid}`);
      const result = await this.client.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({ to, code });

      this.logger.log(`Verify result: status=${result.status}, valid=${result.valid}`);
      return result.status === 'approved';
    } catch (err: any) {
      this.logger.error(`OTP verify failed for ${to}: ${err.message} (code: ${err.code}, status: ${err.status})`);
      return false;
    }
  }

  /**
   * Send a plain SMS (for reminders, alerts — not OTP).
   * Only use for customers who have opted in to SMS.
   */
  async sendSms(phone: string, message: string): Promise<void> {
    if (!this.client) {
      this.logger.warn(`Twilio not configured — cannot send SMS to ${phone}`);
      return;
    }

    const to = this.normalisePhone(phone);

    try {
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`SMS failed for ${to}: ${err.message}`);
      // Non-fatal — log and continue
    }
  }

  /**
   * Validate UAE mobile number format.
   * Accepts: 0501234567, 971501234567, +971501234567
   */
  isValidUaePhone(phone: string): boolean {
    const digits = phone.replace(/[^\d]/g, '');
    // UAE mobile: 971 5X XXX XXXX (12 digits) or 05X XXX XXXX (10 digits)
    return /^(971[5][0-9]{8}|05[0-9]{8})$/.test(digits);
  }

  private normalisePhone(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '');
    if (digits.startsWith('971')) return `+${digits}`;
    if (digits.startsWith('05')) return `+971${digits.slice(1)}`;
    return `+971${digits}`;
  }
}
