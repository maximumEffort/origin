import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CalculatorService } from './calculator.service';
import { QuoteDto } from './dto/quote.dto';

@ApiTags('calculator')
@Controller('calculator')
export class CalculatorController {
  constructor(private readonly calculatorService: CalculatorService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Get instant lease quote with VAT breakdown' })
  getQuote(@Body() dto: QuoteDto) {
    return this.calculatorService.getQuote(dto);
  }
}
