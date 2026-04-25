import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Stripe = require('stripe');

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: any;

  constructor(private config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (secretKey && secretKey.startsWith('sk_')) {
      this.stripe = Stripe(secretKey);
      this.logger.log('Stripe client initialised');
    } else {
      this.stripe = null;
      this.logger.warn('Stripe secret key not configured — payments disabled');
    }
  }

  async createPaymentIntent(amountAed: number, metadata: Record<string, string> = {}): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured');
    }

    // Stripe expects amounts in the smallest currency unit (fils for AED)
    const amountFils = Math.round(amountAed * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountFils,
      currency: 'aed',
      metadata,
      automatic_payment_methods: { enabled: true },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
}
