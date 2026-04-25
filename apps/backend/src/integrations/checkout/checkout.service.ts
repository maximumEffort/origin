import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PaymentSession {
  sessionId: string;
  paymentUrl: string;  // Hosted payment page URL
  expiresAt: string;
}

export interface CreatePaymentSessionDto {
  amountAed: number;           // Amount in AED (e.g. 3500.00)
  reference: string;            // Booking or lease reference
  customerName: string;
  customerEmail: string;
  customerPhone: string;        // +971XXXXXXXXX
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface RefundDto {
  paymentId: string;
  amountAed?: number;           // Partial refund if provided, full if omitted
  reference?: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);
  private readonly http: AxiosInstance;
  private readonly webhookSecret: string;

  constructor(private config: ConfigService) {
    const secretKey = this.config.get<string>('CHECKOUT_SECRET_KEY', '');
    this.webhookSecret = this.config.get<string>('CHECKOUT_WEBHOOK_SECRET', '');

    this.http = axios.create({
      baseURL: 'https://api.checkout.com',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a hosted payment session.
   * Returns a URL to redirect the customer to Checkout.com's hosted page.
   * Supports card, Apple Pay, Google Pay — all AED.
   */
  async createPaymentSession(dto: CreatePaymentSessionDto): Promise<PaymentSession> {
    // Checkout.com amounts are in minor units (fils = 1/100 AED)
    const amountFils = Math.round(dto.amountAed * 100);

    const payload = {
      amount: amountFils,
      currency: 'AED',
      reference: dto.reference,
      billing: {
        address: { country: 'AE' },
      },
      customer: {
        name: dto.customerName,
        email: dto.customerEmail,
        phone: { number: dto.customerPhone, country_code: '+971' },
      },
      success_url: dto.successUrl,
      failure_url: dto.failureUrl,
      cancel_url: dto.cancelUrl,
      payment_method_types: ['card', 'applepay', 'googlepay'],
      "3ds": { enabled: true },   // 3DS mandatory for UAE card payments
      metadata: dto.metadata ?? {},
    };

    try {
      const { data } = await this.http.post('/payment-sessions', payload);
      return {
        sessionId: data.id,
        paymentUrl: data._links?.redirect?.href ?? '',
        expiresAt: data.expires_on,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.error_codes?.join(', ') ?? err.message;
      this.logger.error(`Checkout.com session failed: ${msg}`);
      throw new BadRequestException(`Payment session creation failed: ${msg}`);
    }
  }

  /**
   * Retrieve a payment by its ID.
   * Call after webhook to confirm actual status.
   */
  async getPayment(paymentId: string): Promise<any> {
    const { data } = await this.http.get(`/payments/${paymentId}`);
    return data;
  }

  /**
   * Issue a full or partial refund.
   */
  async refund(dto: RefundDto): Promise<void> {
    const body: Record<string, any> = {};
    if (dto.amountAed !== undefined) {
      body.amount = Math.round(dto.amountAed * 100);
    }
    if (dto.reference) body.reference = dto.reference;

    try {
      await this.http.post(`/payments/${dto.paymentId}/refunds`, body);
      this.logger.log(`Refund issued for payment ${dto.paymentId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.error_codes?.join(', ') ?? err.message;
      this.logger.error(`Refund failed: ${msg}`);
      throw new BadRequestException(`Refund failed: ${msg}`);
    }
  }

  /**
   * Verify a webhook signature from Checkout.com.
   * Call this in your webhook controller before processing events.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret) return false;
    // Checkout.com uses HMAC-SHA256
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return signature === expected;
  }

  /**
   * Calculate AED amount with 5% VAT included.
   * Returns { base, vat, total } — all in AED.
   */
  calculateWithVat(baseAed: number): { base: number; vat: number; total: number } {
    const vat = Math.round(baseAed * 0.05 * 100) / 100;
    return {
      base: baseAed,
      vat,
      total: Math.round((baseAed + vat) * 100) / 100,
    };
  }
}
