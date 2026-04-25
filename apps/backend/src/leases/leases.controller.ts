import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeasesService } from './leases.service';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('leases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leases')
export class LeasesController {
  constructor(private readonly leasesService: LeasesService) {}

  @Get()
  @ApiOperation({ summary: "List current customer's leases" })
  findAll(@CurrentUser() user: any) {
    return this.leasesService.findByCustomer(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lease details with payment schedule' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.leasesService.findOne(user.id, id);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Request a lease renewal' })
  renew(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: RenewLeaseDto,
  ) {
    return this.leasesService.renew(user.id, id, dto);
  }
}
