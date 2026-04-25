import { IsOptional, IsString, IsEmail, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

enum Language {
  en = 'en',
  ar = 'ar',
  zh = 'zh',
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Amr Hassan' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'amr@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: Language })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;
}
