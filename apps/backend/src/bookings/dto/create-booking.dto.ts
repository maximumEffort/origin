import { IsUUID, IsDateString, IsInt, IsOptional, IsObject, IsString, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'vehicle-uuid' })
  @IsUUID()
  vehicle_id: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  start_date: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  end_date: string;

  @ApiProperty({ example: 3000, description: 'Monthly km package' })
  @IsInt()
  @Min(1000)
  mileage_package: number;

  @ApiPropertyOptional({ example: { cdw_waiver: true, additional_driver: false } })
  @IsOptional()
  @IsObject()
  add_ons?: Record<string, boolean>;

  @ApiPropertyOptional({ example: 'Dubai Marina, Dubai' })
  @IsOptional()
  @IsString()
  pickup_location?: string;

  @ApiPropertyOptional({ example: 'Business Bay, Dubai' })
  @IsOptional()
  @IsString()
  dropoff_location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
