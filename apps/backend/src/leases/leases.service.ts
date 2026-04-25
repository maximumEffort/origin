import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import { LeaseStatus } from '@prisma/client';

@Injectable()
export class LeasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomer(customerId: string) {
    return this.prisma.lease.findMany({
      where: { customerId },
      include: {
        vehicle: { select: { brand: true, model: true, year: true, plateNumber: true } },
        payments: { orderBy: { dueDate: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(customerId: string, leaseId: string) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        vehicle: true,
        payments: { orderBy: { dueDate: 'asc' } },
        booking: { select: { reference: true, pickupLocation: true } },
      },
    });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.customerId !== customerId) throw new ForbiddenException();
    return lease;
  }

  async renew(customerId: string, leaseId: string, dto: RenewLeaseDto) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) throw new NotFoundException('Lease not found');
    if (lease.customerId !== customerId) throw new ForbiddenException();
    if (lease.status !== LeaseStatus.ACTIVE) {
      throw new BadRequestException('Only active leases can be renewed');
    }

    const newEnd = new Date(dto.new_end_date);
    if (newEnd <= lease.endDate) {
      throw new BadRequestException('new_end_date must be after current lease end date');
    }

    // Mark original as renewed and create new lease
    await this.prisma.lease.update({
      where: { id: leaseId },
      data: { status: LeaseStatus.RENEWED },
    });

    const year = new Date().getFullYear();
    const seq = crypto.randomBytes(4).toString('hex').toUpperCase();

    return this.prisma.lease.create({
      data: {
        reference: `LS-${year}-${seq}`,
        bookingId: lease.bookingId,
        customerId: lease.customerId,
        vehicleId: lease.vehicleId,
        startDate: lease.endDate,
        endDate: newEnd,
        monthlyRateAed: lease.monthlyRateAed,
        vatRate: lease.vatRate,
        mileageLimitMonthly: dto.mileage_package ?? lease.mileageLimitMonthly,
        renewalOfId: leaseId,
        status: LeaseStatus.ACTIVE,
      },
    });
  }
}
