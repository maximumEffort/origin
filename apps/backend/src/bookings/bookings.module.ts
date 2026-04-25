import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CalculatorModule } from '../calculator/calculator.module';
import { SendGridModule } from '../integrations/sendgrid/sendgrid.module';

@Module({
  imports: [CalculatorModule, SendGridModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
