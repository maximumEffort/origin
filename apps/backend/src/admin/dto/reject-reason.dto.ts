import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RejectReasonDto {
  @ApiPropertyOptional({ example: 'Documents are unclear or expired' })
  @IsOptional()
  @IsString()
  reason?: string;
}
