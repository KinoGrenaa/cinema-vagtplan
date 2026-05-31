import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffingRequestsModule } from '../staffing-requests/staffing-requests.module';
import { StaffingAiModule } from './staffing-ai.module';
import { StaffingMonitorService } from './staffing-monitor.service';

@Module({
  imports: [StaffingRequestsModule, StaffingAiModule],
  providers: [PrismaService, StaffingMonitorService],
  exports: [StaffingMonitorService],
})
export class StaffingMonitorModule {}