import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current customer profile' })
  getProfile(@CurrentUser() user: any) {
    return this.customersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update customer profile' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateCustomerDto) {
    return this.customersService.updateProfile(user.id, dto);
  }

  @Get('me/documents')
  @ApiOperation({ summary: 'Get KYC documents and their status' })
  getDocuments(@CurrentUser() user: any) {
    return this.customersService.getDocuments(user.id);
  }

  @Post('me/documents')
  @ApiOperation({ summary: 'Register a KYC document (create record with file URL)' })
  addDocument(
    @CurrentUser() user: any,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.customersService.addDocument(user.id, dto.type, dto.fileUrl, dto.expiryDate);
  }
}
