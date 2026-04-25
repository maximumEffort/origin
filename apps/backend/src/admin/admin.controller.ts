import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingStatus, KycStatus, VehicleStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RejectReasonDto } from './dto/reject-reason.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

/**
 * Admin-only endpoints for managing bookings, customers, KYC, and fleet.
 *
 * All routes require:
 *  1. A valid JWT (JwtAuthGuard)
 *  2. An admin role (RolesGuard + @Roles decorator)
 *
 * Role access matrix:
 *  SUPER_ADMIN   — full access to all routes
 *  SALES         — bookings + customers + KYC
 *  FLEET_MANAGER — vehicles only
 *  FINANCE       — dashboard stats + bookings (read-only)
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  @Get('stats')
  @Roles('SUPER_ADMIN', 'SALES', 'FLEET_MANAGER', 'FINANCE')
  @ApiOperation({ summary: 'Get dashboard KPIs: pending bookings, KYC queue, fleet status, revenue' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────────

  @Get('bookings')
  @Roles('SUPER_ADMIN', 'SALES', 'FINANCE')
  @ApiOperation({ summary: 'List all bookings (admin view with customer & vehicle details)' })
  @ApiQuery({ name: 'status', enum: BookingStatus, required: false })
  listBookings(@Query('status') status?: BookingStatus) {
    return this.adminService.listAllBookings(status);
  }

  @Post('bookings/:id/approve')
  @Roles('SUPER_ADMIN', 'SALES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a submitted booking' })
  approveBooking(@Param('id') id: string) {
    return this.adminService.approveBooking(id);
  }

  @Post('bookings/:id/reject')
  @Roles('SUPER_ADMIN', 'SALES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a submitted booking with optional reason' })
  rejectBooking(@Param('id') id: string, @Body() dto: RejectReasonDto) {
    return this.adminService.rejectBooking(id, dto.reason);
  }

  // ─── Customers & KYC ──────────────────────────────────────────────────────────

  @Get('customers')
  @Roles('SUPER_ADMIN', 'SALES')
  @ApiOperation({ summary: 'List all customers with KYC status and document summary' })
  @ApiQuery({ name: 'kycStatus', enum: KycStatus, required: false })
  listCustomers(@Query('kycStatus') kycStatus?: KycStatus) {
    return this.adminService.listAllCustomers(kycStatus);
  }

  @Get('customers/:id')
  @Roles('SUPER_ADMIN', 'SALES')
  @ApiOperation({ summary: 'Get full customer profile with documents, bookings, and leases' })
  getCustomer(@Param('id') id: string) {
    return this.adminService.getCustomer(id);
  }

  @Post('customers/:id/kyc/approve')
  @Roles('SUPER_ADMIN', 'SALES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a customer KYC submission' })
  approveKyc(@Param('id') id: string) {
    return this.adminService.approveKyc(id);
  }

  @Post('customers/:id/kyc/reject')
  @Roles('SUPER_ADMIN', 'SALES')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a customer KYC submission with optional reason' })
  rejectKyc(@Param('id') id: string, @Body() dto: RejectReasonDto) {
    return this.adminService.rejectKyc(id, dto.reason);
  }

  @Post('bookings/:id/create-lease')
  @Roles('SUPER_ADMIN', 'SALES')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convert an approved booking into an active lease with payment schedule' })
  createLeaseFromBooking(@Param('id') id: string) {
    return this.adminService.createLeaseFromBooking(id);
  }

  // ─── Leases ───────────────────────────────────────────────────────────────────

  @Get('leases')
  @Roles('SUPER_ADMIN', 'SALES', 'FINANCE')
  @ApiOperation({ summary: 'List all leases with customer, vehicle, and payment details' })
  @ApiQuery({ name: 'status', required: false })
  listLeases(@Query('status') status?: string) {
    return this.adminService.listAllLeases(status);
  }

  // ─── Fleet / Vehicles ─────────────────────────────────────────────────────────

  @Get('vehicles')
  @Roles('SUPER_ADMIN', 'FLEET_MANAGER', 'SALES', 'FINANCE')
  @ApiOperation({ summary: 'List all vehicles with booking count and status (admin view)' })
  @ApiQuery({ name: 'status', enum: VehicleStatus, required: false })
  listVehicles(@Query('status') status?: VehicleStatus) {
    return this.adminService.listAllVehicles(status);
  }

  @Post('vehicles')
  @Roles('SUPER_ADMIN', 'FLEET_MANAGER')
  @ApiOperation({ summary: 'Add a new vehicle to the fleet' })
  createVehicle(@Body() dto: CreateVehicleDto) {
    return this.adminService.createVehicle(dto);
  }

  @Patch('vehicles/:id')
  @Roles('SUPER_ADMIN', 'FLEET_MANAGER')
  @ApiOperation({ summary: 'Update vehicle details or rate' })
  updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.adminService.updateVehicle(id, dto);
  }

  @Post('vehicles/:id/status')
  @Roles('SUPER_ADMIN', 'FLEET_MANAGER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set vehicle status: AVAILABLE, MAINTENANCE, RETIRED, etc.' })
  setVehicleStatus(
    @Param('id') id: string,
    @Body('status') status: VehicleStatus,
  ) {
    return this.adminService.setVehicleStatus(id, status);
  }
}
