import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ShiftTradesService } from './shift-trades.service';
import { ShiftTradesController } from './shift-trades.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
    }),
  ],
  controllers: [ShiftTradesController],
  providers: [ShiftTradesService],
})
export class ShiftTradesModule {}