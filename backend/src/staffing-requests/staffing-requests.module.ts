import { Module } from '@nestjs/common';
import { StaffingRequestsController } from './staffing-requests.controller';
import { StaffingRequestsService } from './staffing-requests.service';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';

@Module({
  imports: [StaffingAiModule],

  controllers: [StaffingRequestsController],

  providers: [StaffingRequestsService, PrismaService, RealtimeGateway],

  exports: [StaffingRequestsService],
})
export class StaffingRequestsModule {}
