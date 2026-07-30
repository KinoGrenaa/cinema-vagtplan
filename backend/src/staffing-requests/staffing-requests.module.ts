import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StaffingRequestsController } from './staffing-requests.controller';
import { StaffingRequestsService } from './staffing-requests.service';
import { StaffingAiModule } from '../staffing-ai/staffing-ai.module';
import { RealtimeModule } from '../realtime/realtime.module';
@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),

    StaffingAiModule,
    RealtimeModule,
  ],
  controllers: [StaffingRequestsController],
  providers: [StaffingRequestsService],
  exports: [StaffingRequestsService],
})
export class StaffingRequestsModule {}
