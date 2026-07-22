import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';
import { AiLearningModule } from './ai-learning/ai-learning.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { CinemaModuleAccessGuard } from './cinema-modules/cinema-module-access.guard';
import { CinemaModulesModule } from './cinema-modules/cinema-modules.module';
import { CinemasModule } from './cinemas/cinemas.module';
import { DayPeriodsModule } from './day-periods/day-periods.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';
import { JobFunctionsModule } from './job-functions/job-functions.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { MessagesModule } from './messages/messages.module';
import { MonthPlansModule } from './month-plans/month-plans.module';
import { MovieShowingsModule } from './movie-showings/movie-showings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PayrollTypesModule } from './payroll-types/payroll-types.module';
import { PayrollModule } from './payroll/payroll.module';
import { PrismaModule } from './prisma/prisma.module';
import { PushSubscriptionsModule } from './push-subscriptions/push-subscriptions.module';
import { PushModule } from './push/push.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ScheduleTemplatesModule } from './schedule-templates/schedule-templates.module';
import { ShiftPlanningDraftsModule } from './shift-planning-drafts/shift-planning-drafts.module';
import { ShiftTradesModule } from './shift-trades/shift-trades.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StaffingMonitorModule } from './staffing-ai/staffing-monitor.module';
import { StaffingRequestsModule } from './staffing-requests/staffing-requests.module';
import { SystemErrorLogsModule } from './system-error-logs/system-error-logs.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { UsersModule } from './users/users.module';
import { WorkTypesModule } from './work-types/work-types.module';

@Module({
  imports: [
    StaffingMonitorModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ShiftsModule,
    WorkTypesModule,
    DayPeriodsModule,
    JobFunctionsModule,
    ScheduleTemplatesModule,
    MonthPlansModule,
    ShiftPlanningDraftsModule,
    MovieShowingsModule,
    LeaveRequestsModule,
    ShiftTradesModule,
    MessagesModule,
    TimeEntriesModule,
    RealtimeModule,
    PayrollModule,
    PushModule,
    EmployeeDocumentsModule,
    CinemasModule,
    CinemaModulesModule,
    NotificationsModule,
    PushSubscriptionsModule,
    AuditLogsModule,
    SystemErrorLogsModule,
    AiLearningModule,
    StaffingRequestsModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PayrollTypesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useExisting:
        CinemaModuleAccessGuard,
    },
  ],
})
export class AppModule {}
