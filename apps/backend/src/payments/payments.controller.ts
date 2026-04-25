import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a deposit or reservation' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    const metadata: Record<string, string> = {};
    if (dto.bookingRef) metadata.bookingRef = dto.bookingRef;
    if (dto.serviceType) metadata.serviceType = dto.serviceType;
    if (dto.vehicleName) metadata.vehicleName = dto.vehicleName;

    return this.stripeService.createPaymentIntent(dto.amountAed, metadata);
  }
}
