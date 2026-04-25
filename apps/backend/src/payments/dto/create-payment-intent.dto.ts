import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 5000, description: 'Payment amount in AED' })
  @IsNumber()
  @Min(1)
  @Max(500000)
  amountAed: number;

  @ApiPropertyOptional({ example: 'BK-20260401-ABC1' })
  @IsOptional()
  @IsString()
  bookingRef?: string;

  @ApiPropertyOptional({ example: 'lease' })
  @IsOptional()
  @IsString()
  serviceType?: string;

  @ApiPropertyOptional({ example: 'BYD Seal' })
  @IsOptional()
  @IsString()
  vehicleName?: string;
}
