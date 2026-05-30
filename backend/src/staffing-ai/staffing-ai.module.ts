import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { StaffingAiService } from './staffing-ai.service';
import { StaffingRankingService } from './staffing-ranking.service';


import { AvailabilityEngineService } from './availability-engine.service';
import { FatigueEngineService } from './fatigue-engine.service';
import { FairnessEngineService } from './fairness-engine.service';
import { PreferenceEngineService } from './preference-engine.service';
import { RetentionEngineService } from './retention-engine.service';

import { ShiftGenerationService } from './shift-generation.service';
import { ScheduleOptimizationService } from './schedule-optimization.service';
import { ScheduleSimulationService } from './schedule-simulation.service';
import { ScheduleComparisonService } from './schedule-comparison.service';

import { PredictiveStaffingService } from './predictive-staffing.service';
import { AbsenceImpactEngineService } from './absence-impact-engine.service';

@Module({
  providers: [
    PrismaService,
    StaffingAiService,
    StaffingRankingService,
    AvailabilityEngineService,
    FatigueEngineService,
    FairnessEngineService,
    PreferenceEngineService,
    RetentionEngineService,
    ShiftGenerationService,
    ScheduleOptimizationService,
    ScheduleSimulationService,
    ScheduleComparisonService,
    PredictiveStaffingService,
    AbsenceImpactEngineService,
  ],

  exports: [
    StaffingAiService,
    StaffingRankingService,
    AvailabilityEngineService,
    FatigueEngineService,
    FairnessEngineService,
    PreferenceEngineService,
    RetentionEngineService,
    ShiftGenerationService,
    ScheduleOptimizationService,
    ScheduleSimulationService,
    ScheduleComparisonService,
    PredictiveStaffingService,
    AbsenceImpactEngineService,
  ],
})
export class StaffingAiModule {}