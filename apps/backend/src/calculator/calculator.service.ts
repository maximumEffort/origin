import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { QuoteDto } from './dto/quote.dto';

const VAT_RATE = Number(process.env.VAT_RATE ?? 0.05);

const ADD_ON_PRICES: Record<string, number> = {
  additional_driver: 150,
  cdw_waiver: 200,
  gps_tracker: 50,
};

@Injectable()
export class CalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async getQuote(dto: QuoteDto) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicle_id },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (end <= start) throw new BadRequestException('end_date must be after start_date');

    const durationDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const durationMonths = durationDays / 30;

    let monthly = Number(vehicle.monthlyRateAed);

    // Mileage surcharge above vehicle base limit
    if (dto.mileage_package > vehicle.mileageLimitMonthly) {
      monthly += (dto.mileage_package - vehicle.mileageLimitMonthly) * 0.05;
    }

    // Add-ons
    let addOnsMonthly = 0;
    for (const [key, enabled] of Object.entries(dto.add_ons ?? {})) {
      if (enabled && ADD_ON_PRICES[key]) addOnsMonthly += ADD_ON_PRICES[key];
    }
    monthly += addOnsMonthly;

    // Long-term discounts
    if (durationDays >= 365) monthly *= 0.92;
    else if (durationDays >= 180) monthly *= 0.96;
    else if (durationDays >= 90) monthly *= 0.98;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const subtotal = round2(monthly * durationMonths);
    const vat = round2(subtotal * VAT_RATE);
    const total = round2(subtotal + vat);
    const deposit = round2(monthly);

    // Monthly payment breakdown
    const monthlyBreakdown: { month: string; amount_aed: number; vat_aed: number; total_aed: number }[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < Math.ceil(durationMonths); i++) {
      const label = cursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const base = round2(monthly);
      const vatAmt = round2(base * VAT_RATE);
      monthlyBreakdown.push({
        month: label,
        amount_aed: base,
        vat_aed: vatAmt,
        total_aed: round2(base + vatAmt),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return {
      duration_days: durationDays,
      subtotal_aed: subtotal,
      vat_rate: VAT_RATE,
      vat_amount_aed: vat,
      total_aed: total,
      deposit_aed: deposit,
      monthly_breakdown: monthlyBreakdown,
    };
  }
}
