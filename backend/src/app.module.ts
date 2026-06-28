import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { WorkTypesModule } from './work-types/work-types.module';
import { DayPeriodsModule } from './day-periods/day-periods.module';
import { MovieShowingsModule } from './movie-showings/movie-showings.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { ShiftTradesModule } from './shift-trades/shift-trades.module';
import { MessagesModule } from './messages/messages.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PayrollModule } from './payroll/payroll.module';
import { PushModule } from './push/push.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CinemasModule } from './cinemas/cinemas.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PushSubscriptionsModule } from './push-subscriptions/push-subscriptions.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PayrollTypesModule } from './payroll-types/payroll-types.module';
import { AiLearningModule } from './ai-learning/ai-learning.module';
import { StaffingRequestsModule } from './staffing-requests/staffing-requests.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StaffingMonitorModule } from './staffing-ai/staffing-monitor.module';
import { SystemErrorLogsModule } from './system-error-logs/system-error-logs.module';

@Module({
  imports: [
    StaffingMonitorModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ShiftsModule,
    WorkTypesModule,
    DayPeriodsModule,
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
  ],
})
export class AppModule {}
