import { Module } from '@nestjs/common';
import { StaffingRequestsModule } from '../staffing-requests/staffing-requests.module';
import { StaffingAiModule } from './staffing-ai.module';
import { StaffingMonitorService } from './staffing-monitor.service';

@Module({
  imports: [StaffingRequestsModule, StaffingAiModule],
  providers: [StaffingMonitorService],
  exports: [StaffingMonitorService],
})
export class StaffingMonitorModule {}
