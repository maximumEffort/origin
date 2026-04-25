import { IsDateString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RenewLeaseDto {
  @ApiProperty({ example: '2027-03-31', description: 'New lease end date' })
  @IsDateString()
  new_end_date: string;

  @ApiPropertyOptional({ example: 3000, description: 'Updated monthly mileage package (km)' })
  @IsOptional()
  @IsInt()
  @Min(1000)
  mileage_package?: number;
}
