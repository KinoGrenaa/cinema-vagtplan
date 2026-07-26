import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PayrollModule } from '../payroll/payroll.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MyTimeEntriesController } from './my-time-entries.controller';
import { TimeApprovalEntriesController } from './time-approval-entries.controller';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';

@Module({
  imports: [
    RealtimeModule,
    AuditLogsModule,
    PayrollModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    TimeEntriesController,
    MyTimeEntriesController,
    TimeApprovalEntriesController,
  ],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
