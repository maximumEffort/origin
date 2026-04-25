import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { FilterVehiclesDto } from './dto/filter-vehicles.dto';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List vehicles with optional filters' })
  findAll(@Query() filters: FilterVehiclesDto) {
    return this.vehiclesService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full vehicle details by ID' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }
}
