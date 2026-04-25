import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';
import { Prisma, VehicleStatus } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: FilterVehiclesDto) {
    const { brand, category, fuel_type, min_price, max_price, page = 1, limit = 20 } = filters;

    const where: Prisma.VehicleWhereInput = {
      status: VehicleStatus.AVAILABLE,
      ...(brand && { brand: brand.toUpperCase() as any }),
      ...(fuel_type && { fuelType: fuel_type.toUpperCase() as any }),
      ...(min_price !== undefined && { monthlyRateAed: { gte: min_price } }),
      ...(max_price !== undefined && {
        monthlyRateAed: {
          ...(min_price !== undefined ? { gte: min_price } : {}),
          lte: max_price,
        },
      }),
      ...(category && {
        category: { nameEn: { contains: category, mode: 'insensitive' as const } },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: {
          category: true,
          images: { where: { isPrimary: true }, take: 1 },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { monthlyRateAed: 'asc' },
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: data.map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        category: v.category,
        fuelType: v.fuelType,
        transmission: v.transmission,
        colour: v.colour,
        seats: v.seats,
        monthlyRateAed: v.monthlyRateAed,
        dailyRateAed: v.dailyRateAed,
        mileageLimitMonthly: v.mileageLimitMonthly,
        status: v.status,
        notes: v.notes,
        priceAed: v.priceAed,
        leaseMonthlyAed: v.leaseMonthlyAed,
        downPaymentPct: v.downPaymentPct,
        primaryImageUrl: v.images[0]?.url ?? null,
      })),
      pagination: { page, limit, total },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }
}
