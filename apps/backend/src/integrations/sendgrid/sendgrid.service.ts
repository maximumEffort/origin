import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

export type EmailLanguage = 'en' | 'ar' | 'zh';

export interface SendEmailDto {
  to: string;
  templateId: string;
  dynamicData: Record<string, any>;
  language?: EmailLanguage;
}

/**
 * SendGrid Dynamic Template IDs.
 * Create these templates in SendGrid Dashboard → Email API → Dynamic Templates.
 * Each template has EN/AR/ZH variants — use the language suffix.
 */
export const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMED: {
    en: 'd-booking-confirmed-en',
    ar: 'd-booking-confirmed-ar',
    zh: 'd-booking-confirmed-zh',
  },
  BOOKING_APPROVED: {
    en: 'd-booking-approved-en',
    ar: 'd-booking-approved-ar',
    zh: 'd-booking-approved-zh',
  },
  PAYMENT_RECEIPT: {
    en: 'd-payment-receipt-en',
    ar: 'd-payment-receipt-ar',
    zh: 'd-payment-receipt-zh',
  },
  PAYMENT_REMINDER: {
    en: 'd-payment-reminder-en',
    ar: 'd-payment-reminder-ar',
    zh: 'd-payment-reminder-zh',
  },
  LEASE_EXPIRY: {
    en: 'd-lease-expiry-en',
    ar: 'd-lease-expiry-ar',
    zh: 'd-lease-expiry-zh',
  },
  KYC_INCOMPLETE: {
    en: 'd-kyc-incomplete-en',
    ar: 'd-kyc-incomplete-ar',
    zh: 'd-kyc-incomplete-zh',
  },
  WELCOME: {
    en: 'd-welcome-en',
    ar: 'd-welcome-ar',
    zh: 'd-welcome-zh',
  },
} as const;

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY', '');
    this.fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@originleasing.ae');
    this.fromName = this.config.get<string>('SENDGRID_FROM_NAME', 'Origin Car Leasing');

    if (apiKey && apiKey.startsWith('SG.')) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY is not configured — email sending is disabled');
    }
  }

  /**
   * Send a transactional email using a SendGrid Dynamic Template.
   * Template variables are injected via dynamicData.
   */
  async sendTemplateEmail(
    to: string,
    templateKey: keyof typeof EMAIL_TEMPLATES,
    dynamicData: Record<string, any>,
    language: EmailLanguage = 'en',
  ): Promise<void> {
    const templateId = EMAIL_TEMPLATES[templateKey]?.[language];
    if (!templateId) {
      this.logger.warn(`Unknown email template: ${templateKey} / ${language}`);
      return;
    }

    const msg = {
      to,
      from: { email: this.fromEmail, name: this.fromName },
      templateId,
      dynamicTemplateData: {
        ...dynamicData,
        // Always inject these so templates can use them
        companyName: '[Company Name]',
        supportEmail: this.fromEmail,
        year: new Date().getFullYear(),
      },
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Email sent: ${templateKey} → ${to}`);
    } catch (err: any) {
      this.logger.error(`SendGrid failed: ${err?.response?.body?.errors?.[0]?.message ?? err.message}`);
      // Non-fatal — log and continue
    }
  }

  // --- Convenience wrappers ---

  async sendBookingConfirmation(to: string, data: Record<string, any>, lang: EmailLanguage) {
    return this.sendTemplateEmail(to, 'BOOKING_CONFIRMED', data, lang);
  }

  async sendPaymentReceipt(to: string, data: Record<string, any>, lang: EmailLanguage) {
    return this.sendTemplateEmail(to, 'PAYMENT_RECEIPT', data, lang);
  }

  async sendLeaseExpiryReminder(to: string, data: Record<string, any>, lang: EmailLanguage) {
    return this.sendTemplateEmail(to, 'LEASE_EXPIRY', data, lang);
  }

  async sendKycIncompleteAlert(to: string, data: Record<string, any>, lang: EmailLanguage) {
    return this.sendTemplateEmail(to, 'KYC_INCOMPLETE', data, lang);
  }

  async sendWelcome(to: string, data: Record<string, any>, lang: EmailLanguage) {
    return this.sendTemplateEmail(to, 'WELCOME', data, lang);
  }
}
