import { Module } from '@nestjs/common';
import { StaffingRequestsController } from './staffing-requests.controller';
import { StaffingRequestsService } from './staffing-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [StaffingAiModule, RealtimeModule],
  controllers: [StaffingRequestsController],
  providers: [StaffingRequestsService, PrismaService],
  exports: [StaffingRequestsService],
})
export class StaffingRequestsModule {}
