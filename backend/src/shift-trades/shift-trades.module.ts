import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ShiftTradesService } from './shift-trades.service';
import { ShiftTradesController } from './shift-trades.controller';

import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'supersecret',
    }),
  ],
  controllers: [ShiftTradesController],
  providers: [ShiftTradesService],
})
export class ShiftTradesModule {}