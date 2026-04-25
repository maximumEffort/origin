import { Module } from '@nestjs/common';
import { TabbyService } from './tabby.service';

@Module({
  providers: [TabbyService],
  exports: [TabbyService],
})
export class TabbyModule {}
