import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface TabbySessionDto {
  amountAed: number;           // Total amount in AED
  orderReference: string;       // Booking or lease reference
  customerName: string;
  customerEmail: string;
  customerPhone: string;        // +971XXXXXXXXX
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  items: TabbyItem[];
}

export interface TabbyItem {
  title: string;               // e.g. "BYD Atto 3 — 6 Month Lease"
  description?: string;
  quantity: number;
  unitPriceAed: number;
}

export interface TabbySession {
  sessionId: string;
  paymentUrl: string;           // Redirect customer here
  status: string;
}

/**
 * Tabby BNPL (Buy Now Pay Later) integration.
 * Allows customers to split lease deposits into 4 instalments — very popular in UAE/GCC.
 *
 * Flow:
 *  1. Create a Tabby session → get redirect URL
 *  2. Redirect customer to Tabby's hosted page
 *  3. Tabby redirects back to success/cancel/failure URL
 *  4. Verify payment via webhook or GET /payments/{id}
 *
 * Docs: https://docs.tabby.ai
 */
@Injectable()
export class TabbyService {
  private readonly logger = new Logger(TabbyService.name);
  private readonly http: AxiosInstance;
  private readonly merchantCode: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('TABBY_API_KEY', '');
    this.merchantCode = this.config.get<string>('TABBY_MERCHANT_CODE', '');

    this.http = axios.create({
      baseURL: 'https://api.tabby.ai/api/v2',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a Tabby checkout session.
   * Returns a URL to redirect the customer to Tabby's hosted instalment page.
   */
  async createSession(dto: TabbySessionDto): Promise<TabbySession> {
    const payload = {
      payment: {
        amount: dto.amountAed.toFixed(2),
        currency: 'AED',
        description: `Lease booking ${dto.orderReference}`,
        buyer: {
          phone: dto.customerPhone,
          email: dto.customerEmail,
          name: dto.customerName,
        },
        order: {
          reference_id: dto.orderReference,
          items: dto.items.map((item) => ({
            title: item.title,
            description: item.description ?? item.title,
            quantity: item.quantity,
            unit_price: item.unitPriceAed.toFixed(2),
            discount_amount: '0.00',
            reference_id: dto.orderReference,
            image_url: '',
            product_url: '',
            category: 'Transportation',
          })),
        },
        buyer_history: {
          registered_since: new Date().toISOString(),
          loyalty_level: 0,
        },
        order_history: [],
        meta: {
          order_id: dto.orderReference,
          customer: dto.customerEmail,
        },
      },
      lang: 'en',
      merchant_code: this.merchantCode,
      merchant_urls: {
        success: dto.successUrl,
        cancel: dto.cancelUrl,
        failure: dto.failureUrl,
      },
    };

    try {
      const { data } = await this.http.post('/checkout', payload);

      const configuration = data.configuration;
      if (!configuration) {
        throw new BadRequestException('Tabby session created but no configuration returned');
      }

      // Find the instalment product URL
      const instalmentProduct = configuration.available_products?.installments?.[0];
      const webUrl = instalmentProduct?.web_url ?? '';

      return {
        sessionId: data.id,
        paymentUrl: webUrl,
        status: data.status,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err.message;
      this.logger.error(`Tabby session failed: ${msg}`);
      throw new BadRequestException(`Tabby checkout failed: ${msg}`);
    }
  }

  /**
   * Retrieve a Tabby payment by its ID.
   * Call after the customer returns from Tabby to verify status.
   */
  async getPayment(paymentId: string): Promise<any> {
    try {
      const { data } = await this.http.get(`/payments/${paymentId}`);
      return data;
    } catch (err: any) {
      this.logger.error(`Tabby getPayment failed: ${err.message}`);
      throw new BadRequestException('Could not retrieve Tabby payment');
    }
  }

  /**
   * Capture an authorised Tabby payment.
   * Must be called after the lease/booking is confirmed to release the funds.
   */
  async capturePayment(paymentId: string, amountAed: number): Promise<void> {
    try {
      await this.http.post(`/payments/${paymentId}/captures`, {
        amount: amountAed.toFixed(2),
      });
      this.logger.log(`Tabby payment captured: ${paymentId}`);
    } catch (err: any) {
      this.logger.error(`Tabby capture failed: ${err.message}`);
      throw new BadRequestException('Tabby payment capture failed');
    }
  }

  /**
   * Check if Tabby is available for a given customer phone.
   * Tabby performs a soft eligibility check — no credit impact.
   */
  async checkEligibility(phone: string, email: string, amountAed: number): Promise<boolean> {
    try {
      const { data } = await this.http.post('/checkout', {
        payment: {
          amount: amountAed.toFixed(2),
          currency: 'AED',
          description: 'Eligibility check',
          buyer: { phone, email, name: '' },
          order: { reference_id: 'eligibility-check', items: [] },
          order_history: [],
        },
        merchant_code: this.merchantCode,
        merchant_urls: { success: '', cancel: '', failure: '' },
      });
      return data.status === 'created';
    } catch {
      return false;
    }
  }
}
