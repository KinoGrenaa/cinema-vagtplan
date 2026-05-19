import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
