import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { MonthPlansController } from './month-plans.controller';
import { MonthPlansService } from './month-plans.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MonthPlansController],
  providers: [MonthPlansService],
})
export class MonthPlansModule {}
