import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DayPeriodsController } from './day-periods.controller';
import { DayPeriodsService } from './day-periods.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [DayPeriodsController],
  providers: [DayPeriodsService],
})
export class DayPeriodsModule {}
