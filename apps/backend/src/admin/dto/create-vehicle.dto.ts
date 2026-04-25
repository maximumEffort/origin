import { IsString, IsNumber, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: 'BYD' }) @IsString() brand: string;
  @ApiProperty({ example: 'Atto 3' }) @IsString() model: string;
  @ApiProperty({ example: 2025 }) @IsInt() @Min(2000) year: number;
  @ApiProperty({ example: 3200 }) @IsNumber() monthlyRateAed: number;
  @ApiPropertyOptional({ example: 350 }) @IsOptional() @IsNumber() dailyRateAed?: number;
  @ApiProperty({ example: 'Pearl White' }) @IsString() colour: string;
  @ApiProperty({ example: 'A 12345' }) @IsString() plateNumber: string;
  @ApiProperty({ example: 2000 }) @IsInt() mileageLimitMonthly: number;
  @ApiProperty({ example: 5 }) @IsInt() seats: number;
  @ApiPropertyOptional({ example: 'category-uuid-here' }) @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ example: 'PETROL' }) @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional({ example: 'AUTOMATIC' }) @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() priceAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() leaseMonthlyAed?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insuranceExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() rtaRegistrationExpiry?: string;
}
