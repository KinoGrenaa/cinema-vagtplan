import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PayrollTypesController } from './payroll-types.controller';
import { PayrollTypesService } from './payroll-types.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PayrollTypesController],
  providers: [PayrollTypesService],
  exports: [PayrollTypesService],
})
export class PayrollTypesModule {}
