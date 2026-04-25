import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type Language = 'en' | 'ar' | 'zh';

export interface WhatsAppMessage {
  to: string;        // UAE phone: +971XXXXXXXXX
  language?: Language;
  templateName: string;
  templateParams: Record<string, string>;
}

// All message templates in 3 languages
const TEMPLATES: Record<string, Record<Language, { name: string; params: (p: Record<string, string>) => string[] }>> = {
  BOOKING_CONFIRMED: {
    en: { name: 'booking_confirmed_en', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.bookingRef] },
    ar: { name: 'booking_confirmed_ar', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.bookingRef] },
    zh: { name: 'booking_confirmed_zh', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.bookingRef] },
  },
  BOOKING_APPROVED: {
    en: { name: 'booking_approved_en', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.portalUrl] },
    ar: { name: 'booking_approved_ar', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.portalUrl] },
    zh: { name: 'booking_approved_zh', params: (p) => [p.customerName, p.vehicleName, p.startDate, p.portalUrl] },
  },
  PAYMENT_REMINDER: {
    en: { name: 'payment_reminder_en', params: (p) => [p.customerName, p.amount, p.dueDate, p.portalUrl] },
    ar: { name: 'payment_reminder_ar', params: (p) => [p.customerName, p.amount, p.dueDate, p.portalUrl] },
    zh: { name: 'payment_reminder_zh', params: (p) => [p.customerName, p.amount, p.dueDate, p.portalUrl] },
  },
  LEASE_EXPIRY_REMINDER: {
    en: { name: 'lease_expiry_en', params: (p) => [p.customerName, p.vehicleName, p.endDate, p.daysLeft, p.renewalUrl] },
    ar: { name: 'lease_expiry_ar', params: (p) => [p.customerName, p.vehicleName, p.endDate, p.daysLeft, p.renewalUrl] },
    zh: { name: 'lease_expiry_zh', params: (p) => [p.customerName, p.vehicleName, p.endDate, p.daysLeft, p.renewalUrl] },
  },
  KYC_PENDING: {
    en: { name: 'kyc_pending_en', params: (p) => [p.customerName, p.missingDocs, p.uploadUrl] },
    ar: { name: 'kyc_pending_ar', params: (p) => [p.customerName, p.missingDocs, p.uploadUrl] },
    zh: { name: 'kyc_pending_zh', params: (p) => [p.customerName, p.missingDocs, p.uploadUrl] },
  },
  WELCOME: {
    en: { name: 'welcome_en', params: (p) => [p.customerName, p.catalogueUrl] },
    ar: { name: 'welcome_ar', params: (p) => [p.customerName, p.catalogueUrl] },
    zh: { name: 'welcome_zh', params: (p) => [p.customerName, p.catalogueUrl] },
  },
};

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  /**
   * Send a WhatsApp template message.
   * Automatically selects the right template variant based on language.
   */
  async sendTemplate(
    to: string,
    templateKey: keyof typeof TEMPLATES,
    params: Record<string, string>,
    language: Language = 'en',
  ): Promise<void> {
    const template = TEMPLATES[templateKey]?.[language];
    if (!template) {
      this.logger.warn(`Unknown template: ${templateKey} / ${language}`);
      return;
    }

    const components = template.params(params).map((value) => ({
      type: 'text',
      text: value,
    }));

    const body = {
      messaging_product: 'whatsapp',
      to: this.normalisePhone(to),
      type: 'template',
      template: {
        name: template.name,
        language: { code: this.languageCode(language) },
        components: [
          {
            type: 'body',
            parameters: components,
          },
        ],
      },
    };

    try {
      await axios.post(this.apiUrl, body, {
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      });
      this.logger.log(`WhatsApp sent: ${templateKey} → ${to}`);
    } catch (err: any) {
      this.logger.error(`WhatsApp failed: ${err?.response?.data?.error?.message ?? err.message}`);
      // Non-fatal: log and continue — never throw so the caller's flow isn't broken
    }
  }

  /**
   * Send a free-text message (for support conversations, not outbound campaigns).
   * Only usable within the 24-hour customer service window.
   */
  async sendText(to: string, text: string): Promise<void> {
    const body = {
      messaging_product: 'whatsapp',
      to: this.normalisePhone(to),
      type: 'text',
      text: { body: text },
    };

    try {
      await axios.post(this.apiUrl, body, {
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      this.logger.error(`WhatsApp text failed: ${err?.response?.data?.error?.message ?? err.message}`);
    }
  }

  // --- Convenience wrappers ---

  async sendBookingConfirmation(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'BOOKING_CONFIRMED', params, lang);
  }

  async sendBookingApproved(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'BOOKING_APPROVED', params, lang);
  }

  async sendPaymentReminder(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'PAYMENT_REMINDER', params, lang);
  }

  async sendLeaseExpiryReminder(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'LEASE_EXPIRY_REMINDER', params, lang);
  }

  async sendKycPendingAlert(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'KYC_PENDING', params, lang);
  }

  async sendWelcome(to: string, params: Record<string, string>, lang: Language) {
    return this.sendTemplate(to, 'WELCOME', params, lang);
  }

  // --- Helpers ---

  private normalisePhone(phone: string): string {
    // Ensure E.164 format — strip spaces/dashes, ensure + prefix
    const digits = phone.replace(/[^\d]/g, '');
    return digits.startsWith('971') ? `+${digits}` : `+971${digits}`;
  }

  private languageCode(lang: Language): string {
    const map: Record<Language, string> = { en: 'en', ar: 'ar', zh: 'zh_CN' };
    return map[lang];
  }
}
