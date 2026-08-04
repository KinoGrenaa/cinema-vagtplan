import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRulesService } from './payroll-rules.service';
import { PayrollVersioningService } from './payroll-versioning.service';
import { PayrollRetroactiveAdjustmentService } from './payroll-retroactive-adjustment.service';
import {
  PayRulesController,
  PayrollConfigurationController,
  PayrollSpecialDaysController,
} from './payroll-configuration.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    PayrollController,
    PayrollConfigurationController,
    PayRulesController,
    PayrollSpecialDaysController,
  ],
  providers: [
    PayrollService,
    PayrollRulesService,
    PayrollVersioningService,
    PayrollRetroactiveAdjustmentService,
  ],
  exports: [PayrollService, PayrollVersioningService],
})
export class PayrollModule {}
