import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+971501234567', description: 'UAE mobile number' })
  @IsString()
  @Matches(/^\+971[0-9]{8,9}$/, {
    message: 'Must be a valid UAE phone number (+971XXXXXXXXX)',
  })
  phone: string;
}