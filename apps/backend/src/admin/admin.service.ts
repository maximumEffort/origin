import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SendGridService, EmailLanguage } from '../integrations/sendgrid/sendgrid.service';
import { BookingStatus, KycStatus, VehicleStatus } from '@prisma/client';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sendGrid: SendGridService,
  ) {}

  // ─── Bookings ────────────────────────────────────────────────────────────────

  async listAllBookings(status?: BookingStatus) {
    return this.prisma.booking.findMany({
      where: status ? { status } : undefined,
      include: {
        customer: { select: { fullName: true, phone: true, kycStatus: true } },
        vehicle: { select: { brand: true, model: true, year: true, plateNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted bookings can be approved');
    }
    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.APPROVED },
    });

    // Send booking approved email (non-blocking)
    void this.prisma.customer
      .findUnique({ where: { id: booking.customerId } })
      .then((customer) => {
        if (customer?.email) {
          const lang = (customer.preferredLanguage as EmailLanguage) ?? 'en';
          return this.sendGrid.sendTemplateEmail(
            customer.email,
            'BOOKING_APPROVED',
            {
              bookingRef: booking.reference,
              customerName: customer.fullName,
              startDate: booking.startDate.toISOString().split('T')[0],
              endDate: booking.endDate.toISOString().split('T')[0],
              totalAed: booking.grandTotalAed,
            },
            lang,
          );
        }
      });

    return updated;
  }

  async rejectBooking(bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted bookings can be rejected');
    }
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.REJECTED,
        ...(reason ? { notes: reason } : {}),
      },
    });
  }

  // ─── Customers & KYC ─────────────────────────────────────────────────────────

  async listAllCustomers(kycStatus?: KycStatus) {
    return this.prisma.customer.findMany({
      where: kycStatus ? { kycStatus } : undefined,
      include: {
        documents: { select: { type: true, status: true, fileUrl: true } },
        _count: { select: { bookings: true, leases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomer(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        documents: true,
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { vehicle: { select: { brand: true, model: true } } },
        },
        leases: { orderBy: { startDate: 'desc' }, take: 5 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async approveKyc(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.kycStatus !== KycStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted KYC applications can be approved');
    }
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { kycStatus: KycStatus.APPROVED },
    });
  }

  async rejectKyc(customerId: string, reason?: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        kycStatus: KycStatus.REJECTED,
        ...(reason ? { kycRejectionReason: reason } : {}),
      },
    });

    // Send KYC incomplete alert (non-blocking)
    if (customer.email) {
      const lang = (customer.preferredLanguage as EmailLanguage) ?? 'en';
      void this.sendGrid.sendKycIncompleteAlert(
        customer.email,
        { customerName: customer.fullName, rejectionReason: reason ?? '' },
        lang,
      );
    }

    return updated;
  }

  // ─── Fleet / Vehicles ─────────────────────────────────────────────────────────

  async listAllVehicles(status?: VehicleStatus) {
    return this.prisma.vehicle.findMany({
      where: status ? { status } : undefined,
      include: {
        category: true,
        images: { where: { isPrimary: true }, take: 1 },
        _count: { select: { bookings: true, leases: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVehicle(dto: CreateVehicleDto) {
    // Auto-generate VIN if not provided
    const vin = (dto as any).vin ?? `ORIGIN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // If no categoryId, find or create a category based on fuel type
    let categoryId = dto.categoryId;
    if (!categoryId || categoryId === '') {
      const fuelType = (dto.fuelType ?? 'ELECTRIC').toUpperCase();
      const categoryName = fuelType === 'ELECTRIC' ? 'Electric' : fuelType === 'HYBRID' ? 'Hybrid' : 'Standard';
      let category = await this.prisma.vehicleCategory.findFirst({
        where: { nameEn: { contains: categoryName } },
      });
      if (!category) {
        category = await this.prisma.vehicleCategory.create({
          data: { nameEn: categoryName, nameAr: categoryName, nameZh: categoryName },
        });
      }
      categoryId = category.id;
    }

    return this.prisma.vehicle.create({
      data: {
        brand: dto.brand as any,
        model: dto.model,
        year: dto.year,
        colour: dto.colour,
        plateNumber: dto.plateNumber,
        seats: dto.seats,
        monthlyRateAed: dto.monthlyRateAed,
        dailyRateAed: dto.dailyRateAed ?? 0,
        mileageLimitMonthly: dto.mileageLimitMonthly,
        fuelType: (dto.fuelType ?? 'ELECTRIC') as any,
        transmission: (dto.transmission ?? 'AUTOMATIC') as any,
        notes: dto.notes ?? null,
        priceAed: dto.priceAed ?? null,
        leaseMonthlyAed: dto.leaseMonthlyAed ?? null,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        rtaRegistrationExpiry: dto.rtaRegistrationExpiry ? new Date(dto.rtaRegistrationExpiry) : null,
        vin,
        categoryId,
      },
    });
  }

  async updateVehicle(vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Convert date strings to Date objects for Prisma
    const data: Record<string, unknown> = { ...dto };
    if (dto.insuranceExpiry) {
      data.insuranceExpiry = new Date(dto.insuranceExpiry);
    }
    if (dto.rtaRegistrationExpiry) {
      data.rtaRegistrationExpiry = new Date(dto.rtaRegistrationExpiry);
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: data as any,
    });
  }

  async setVehicleStatus(vehicleId: string, status: VehicleStatus) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status },
    });
  }

  // ─── Create Lease from Booking ───────────────────────────────────────────────

  async createLeaseFromBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { vehicle: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException('Only approved bookings can be converted to leases');
    }

    // Check if a lease already exists for this booking
    const existingLease = await this.prisma.lease.findFirst({
      where: { bookingId },
    });
    if (existingLease) {
      throw new BadRequestException('A lease already exists for this booking');
    }

    // Calculate monthly rate from total
    const durationMonths = Math.max(1, Math.round(
      (booking.endDate.getTime() - booking.startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000),
    ));
    const monthlyRate = booking.quotedTotalAed
      ? Number(booking.quotedTotalAed) / durationMonths
      : Number(booking.vehicle?.monthlyRateAed ?? 0);

    // Create lease
    const leaseCount = await this.prisma.lease.count();
    const reference = `LS-${new Date().getFullYear()}-${String(leaseCount + 1).padStart(5, '0')}`;

    const lease = await this.prisma.lease.create({
      data: {
        reference,
        customerId: booking.customerId!,
        vehicleId: booking.vehicleId!,
        bookingId: booking.id!,
        startDate: booking.startDate,
        endDate: booking.endDate,
        monthlyRateAed: monthlyRate,
        vatRate: 0.05,
        mileageLimitMonthly: booking.mileagePackage ?? 3000,
        status: 'ACTIVE' as const,
      },
    });

    // Update vehicle status to LEASED
    await this.prisma.vehicle.update({
      where: { id: booking.vehicleId! },
      data: { status: 'LEASED' },
    });

    // Update booking status to CONVERTED
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONVERTED' as any },
    });

    // Create monthly payment schedule
    const payments: {
      leaseId: string; customerId: string; type: 'DEPOSIT' | 'MONTHLY';
      amountAed: number; vatAmountAed: number; totalAed: number;
      dueDate: Date; status: 'PENDING';
    }[] = [];
    for (let i = 0; i < durationMonths; i++) {
      const dueDate = new Date(booking.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      payments.push({
        leaseId: lease.id,
        customerId: booking.customerId,
        type: i === 0 ? 'DEPOSIT' : 'MONTHLY',
        amountAed: monthlyRate,
        vatAmountAed: monthlyRate * 0.05,
        totalAed: monthlyRate * 1.05,
        dueDate,
        status: 'PENDING',
      });
    }
    await this.prisma.payment.createMany({ data: payments as any });

    return lease;
  }

  // ─── Leases ──────────────────────────────────────────────────────────────────

  async listAllLeases(status?: string) {
    return this.prisma.lease.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        customer: { select: { fullName: true, phone: true } },
        vehicle: { select: { brand: true, model: true, year: true, plateNumber: true } },
        payments: { orderBy: { dueDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalCustomers,
      pendingKyc,
      pendingBookings,
      activeLeases,
      availableVehicles,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { kycStatus: KycStatus.SUBMITTED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.SUBMITTED } }),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
      this.prisma.vehicle.count({ where: { status: VehicleStatus.AVAILABLE } }),
      this.prisma.payment.aggregate({
        where: { status: 'PAID' },
        _sum: { amountAed: true },
      }),
    ]);

    return {
      totalCustomers,
      pendingKyc,
      pendingBookings,
      activeLeases,
      availableVehicles,
      totalRevenueAed: totalRevenue._sum.amountAed ?? 0,
    };
  }
}
