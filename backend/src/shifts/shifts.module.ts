import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PushModule } from '../push/push.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MyShiftsController } from './my-shifts.controller';
import { MyShiftsService } from './my-shifts.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  imports: [
    RealtimeModule,
    PushModule,
    AuditLogsModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: {
        expiresIn: '7d',
      },
    }),
  ],
  controllers: [
    ShiftsController,
    MyShiftsController,
  ],
  providers: [
    ShiftsService,
    MyShiftsService,
  ],
})
export class ShiftsModule {}
