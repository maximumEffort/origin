import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CalculatorService } from '../calculator/calculator.service';
import { SendGridService, EmailLanguage } from '../integrations/sendgrid/sendgrid.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, LeaseType } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: CalculatorService,
    private readonly sendGrid: SendGridService,
  ) {}

  private generateReference(): string {
    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `BK-${year}-${seq}`;
  }

  async create(customerId: string, dto: CreateBookingDto) {
    const quote = await this.calculator.getQuote({
      vehicle_id: dto.vehicle_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      mileage_package: dto.mileage_package,
      add_ons: dto.add_ons,
    });

    const booking = await this.prisma.booking.create({
      data: {
        reference: this.generateReference(),
        customerId,
        vehicleId: dto.vehicle_id,
        leaseType: quote.duration_days < 30 ? LeaseType.SHORT_TERM : LeaseType.LONG_TERM,
        startDate: new Date(dto.start_date),
        endDate: new Date(dto.end_date),
        durationDays: quote.duration_days,
        mileagePackage: dto.mileage_package,
        addOns: dto.add_ons ?? {},
        quotedTotalAed: quote.subtotal_aed,
        vatAmountAed: quote.vat_amount_aed,
        grandTotalAed: quote.total_aed,
        depositAmountAed: quote.deposit_aed,
        pickupLocation: dto.pickup_location,
        dropoffLocation: dto.dropoff_location,
        notes: dto.notes,
        status: BookingStatus.DRAFT,
      },
    });

    // Send booking confirmation email (non-blocking)
    void this.prisma.customer
      .findUnique({ where: { id: customerId } })
      .then((customer) => {
        if (customer?.email) {
          const lang = (customer.preferredLanguage as EmailLanguage) ?? 'en';
          return this.sendGrid.sendBookingConfirmation(
            customer.email,
            {
              bookingRef: booking.reference,
              customerName: customer.fullName,
              startDate: booking.startDate.toISOString().split('T')[0],
              endDate: booking.endDate.toISOString().split('T')[0],
              totalAed: booking.grandTotalAed,
              depositAed: booking.depositAmountAed,
            },
            lang,
          );
        }
      });

    return booking;
  }

  async submit(customerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();
    if (booking.status !== BookingStatus.DRAFT) {
      throw new BadRequestException('Only draft bookings can be submitted');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.SUBMITTED },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        vehicle: { select: { brand: true, model: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(customerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();
    return booking;
  }
}
