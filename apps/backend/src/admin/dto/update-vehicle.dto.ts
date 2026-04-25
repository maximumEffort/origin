import { IsOptional, IsString, IsNumber, IsEnum, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() model?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() year?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() monthlyRateAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() dailyRateAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() colour?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() plateNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() mileageLimitMonthly?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() seats?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional({ enum: VehicleStatus }) @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priceAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leaseMonthlyAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rtaRegistrationExpiry?: string;
}
