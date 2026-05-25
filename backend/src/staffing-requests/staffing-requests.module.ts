import { Module } from '@nestjs/common';
import { StaffingRequestsController } from './staffing-requests.controller';
import { StaffingRequestsService } from './staffing-requests.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Module({
  controllers: [StaffingRequestsController],
  providers: [StaffingRequestsService, PrismaService, RealtimeGateway],
  exports: [StaffingRequestsService],
})
export class StaffingRequestsModule {}
