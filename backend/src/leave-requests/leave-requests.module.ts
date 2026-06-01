import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),

    StaffingAiModule,
    RealtimeModule,
    NotificationsModule,
  ],

  controllers: [LeaveRequestsController],

  providers: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
