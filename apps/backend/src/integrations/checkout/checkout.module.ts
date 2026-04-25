import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { SendGridModule } from '../sendgrid/sendgrid.module';
import { CheckoutService } from './checkout.service';
import { CheckoutWebhookController } from './checkout-webhook.controller';

@Module({
  imports: [PrismaModule, SendGridModule],
  controllers: [CheckoutWebhookController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
