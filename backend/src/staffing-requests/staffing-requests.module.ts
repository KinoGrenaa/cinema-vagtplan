import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { StaffingRequestsController } from './staffing-requests.controller';
import { StaffingRequestsService } from './staffing-requests.service';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),

    StaffingAiModule,
  ],

  controllers: [StaffingRequestsController],

  providers: [StaffingRequestsService, PrismaService, RealtimeGateway],

  exports: [StaffingRequestsService],
})
export class StaffingRequestsModule {}