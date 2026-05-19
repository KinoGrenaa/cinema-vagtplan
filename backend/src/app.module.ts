import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ShiftsModule } from './shifts/shifts.module';
import { WorkTypesModule } from './work-types/work-types.module';
import { MovieShowingsModule } from './movie-showings/movie-showings.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { ShiftTradesModule } from './shift-trades/shift-trades.module';
import { MessagesModule } from './messages/messages.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { RealtimeModule } from './realtime/realtime.module';
import { PayrollModule } from './payroll/payroll.module';
import { PushModule } from './push/push.module';
import { EmployeeDocumentsModule } from './employee-documents/employee-documents.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ShiftsModule,
    WorkTypesModule,
    MovieShowingsModule,
    LeaveRequestsModule,
    ShiftTradesModule,
    MessagesModule,
    TimeEntriesModule,
    RealtimeModule,
    PayrollModule,
    PushModule,
    EmployeeDocumentsModule,
  ],
})
export class AppModule {}