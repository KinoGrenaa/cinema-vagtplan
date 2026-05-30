import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),

    StaffingAiModule,
  ],

  controllers: [LeaveRequestsController],

  providers: [LeaveRequestsService],
})
export class LeaveRequestsModule {}