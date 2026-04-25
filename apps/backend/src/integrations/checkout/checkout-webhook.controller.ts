import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendGridService, EmailLanguage } from '../sendgrid/sendgrid.service';

/**
 * Checkout.com sends payment events to this endpoint.
 * Register this URL in your Checkout.com Dashboard → Developers → Webhooks.
 * URL: POST /v1/webhooks/checkout
 */
@Controller('webhooks/checkout')
export class CheckoutWebhookController {
  private readonly logger = new Logger(CheckoutWebhookController.name);

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly prisma: PrismaService,
    private readonly sendGrid: SendGridService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('cko-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? '';

    if (!this.checkoutService.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Checkout webhook: invalid signature');
      throw new ForbiddenException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody);
    this.logger.log(`Checkout event: ${event.type} — ${event.data?.id}`);

    switch (event.type) {
      case 'payment_approved':
        await this.handlePaymentApproved(event.data);
        break;

      case 'payment_declined':
        await this.handlePaymentDeclined(event.data);
        break;

      case 'payment_refunded':
        await this.handlePaymentRefunded(event.data);
        break;

      default:
        this.logger.log(`Unhandled Checkout event: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Handle successful payment: mark Payment as PAID or Booking deposit as paid.
   */
  private async handlePaymentApproved(data: any) {
    const reference = data.reference;
    const paymentId = data.id;
    const amountAed = (data.amount ?? 0) / 100;

    this.logger.log(
      `Payment approved: ${paymentId} — ${amountAed} AED (ref: ${reference})`,
    );

    // Try to update a Payment record matched by gateway reference
    const updated = await this.prisma.payment.updateMany({
      where: {
        gatewayReference: reference,
        status: 'PENDING',
      },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        gateway: 'CHECKOUT_COM',
      },
    });

    if (updated.count > 0) {
      this.logger.log(
        `Marked ${updated.count} payment(s) as PAID for ref ${reference}`,
      );

      // Send payment receipt email (non-blocking)
      void this.prisma.payment
        .findFirst({
          where: { gatewayReference: reference },
          include: { lease: { include: { customer: true } } },
        })
        .then((payment) => {
          const customer = (payment as any)?.lease?.customer;
          if (customer?.email) {
            const lang = (customer.preferredLanguage as EmailLanguage) ?? 'en';
            return this.sendGrid.sendPaymentReceipt(
              customer.email,
              {
                reference,
                amountAed: amountAed,
                paidAt: new Date().toISOString().split('T')[0],
                customerName: customer.fullName,
              },
              lang,
            );
          }
        });

      return;
    }

    // Fallback: match by booking reference for deposit payments
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
      include: { customer: true },
    });

    if (booking) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { depositPaid: true },
      });
      this.logger.log(`Deposit marked paid for booking ${reference}`);

      // Send deposit receipt email (non-blocking)
      const customer = (booking as any).customer;
      if (customer?.email) {
        const lang = (customer.preferredLanguage as EmailLanguage) ?? 'en';
        void this.sendGrid.sendPaymentReceipt(
          customer.email,
          {
            reference,
            amountAed: amountAed,
            paidAt: new Date().toISOString().split('T')[0],
            customerName: customer.fullName,
          },
          lang,
        );
      }
    } else {
      this.logger.warn(
        `No payment or booking found for reference: ${reference}`,
      );
    }
  }

  /**
   * Handle declined payment: mark Payment as OVERDUE so follow-up workflows trigger.
   */
  private async handlePaymentDeclined(data: any) {
    const reference = data.reference;
    const paymentId = data.id;

    this.logger.warn(`Payment declined: ${paymentId} (ref: ${reference})`);

    const updated = await this.prisma.payment.updateMany({
      where: {
        gatewayReference: reference,
        status: 'PENDING',
      },
      data: {
        status: 'OVERDUE',
      },
    });

    this.logger.log(
      `Marked ${updated.count} payment(s) as OVERDUE for ref ${reference}`,
    );
  }

  /**
   * Handle refund: mark Payment as REFUNDED.
   */
  private async handlePaymentRefunded(data: any) {
    const reference = data.reference;
    const paymentId = data.id;

    this.logger.log(`Payment refunded: ${paymentId} (ref: ${reference})`);

    const updated = await this.prisma.payment.updateMany({
      where: {
        gatewayReference: reference,
        status: 'PAID',
      },
      data: {
        status: 'REFUNDED',
      },
    });

    this.logger.log(
      `Marked ${updated.count} payment(s) as REFUNDED for ref ${reference}`,
    );
  }
}
