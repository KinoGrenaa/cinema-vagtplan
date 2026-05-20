import { Module } from '@nestjs/common';
import { ShiftTradesService } from './shift-trades.service';
import { ShiftTradesController } from './shift-trades.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [ShiftTradesController],
  providers: [ShiftTradesService],
})
export class ShiftTradesModule {}