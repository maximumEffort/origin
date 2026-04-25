import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SendGridModule } from '../integrations/sendgrid/sendgrid.module';

@Module({
  imports: [SendGridModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
