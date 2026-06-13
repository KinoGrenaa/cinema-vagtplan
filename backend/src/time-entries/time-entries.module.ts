import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PayrollModule } from '../payroll/payroll.module';

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
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
