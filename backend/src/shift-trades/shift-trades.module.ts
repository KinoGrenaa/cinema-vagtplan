import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ShiftTradesController } from './shift-trades.controller';
import { ShiftTradesService } from './shift-trades.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ShiftTradesController],
  providers: [ShiftTradesService],
})
export class ShiftTradesModule {}
