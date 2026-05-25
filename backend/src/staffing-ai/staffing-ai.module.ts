import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { StaffingAiService } from './staffing-ai.service';
import { StaffingRankingService } from './staffing-ranking.service';
import { AvailabilityEngineService } from './availability-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';

@Module({
  providers: [
    PrismaService,
    StaffingAiService,
    StaffingRankingService,
    AvailabilityEngineService,
    FatigueEngineService,
  ],

  exports: [
    StaffingAiService,
    StaffingRankingService,
    AvailabilityEngineService,
    FatigueEngineService,
  ],
})
export class StaffingAiModule {}
