import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GoogleMapsService } from './google-maps.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Exposes Google Maps endpoints to the frontend.
 * The API key is kept server-side — never exposed to the browser.
 */
@Controller('maps')
@UseGuards(JwtAuthGuard)
export class GoogleMapsController {
  constructor(private readonly mapsService: GoogleMapsService) {}

  @Get('autocomplete')
  autocomplete(
    @Query('input') input: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    return this.mapsService.autocomplete(input, sessionToken);
  }

  @Get('place-details')
  placeDetails(
    @Query('placeId') placeId: string,
    @Query('sessionToken') sessionToken?: string,
  ) {
    return this.mapsService.getPlaceDetails(placeId, sessionToken);
  }
}
