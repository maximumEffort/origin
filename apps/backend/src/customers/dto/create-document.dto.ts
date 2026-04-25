import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum DocumentType {
  EMIRATES_ID = 'EMIRATES_ID',
  DRIVING_LICENCE = 'DRIVING_LICENCE',
  VISA = 'VISA',
  PASSPORT = 'PASSPORT',
}

export class CreateDocumentDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType, { message: 'type must be EMIRATES_ID, DRIVING_LICENCE, VISA, or PASSPORT' })
  type: string;

  @ApiProperty({ example: 'https://storage.example.com/doc.pdf' })
  @IsString()
  @IsUrl({}, { message: 'fileUrl must be a valid URL' })
  fileUrl: string;

  @ApiPropertyOptional({ example: '2027-12-31' })
  @IsOptional()
  @IsString()
  expiryDate?: string;
}
