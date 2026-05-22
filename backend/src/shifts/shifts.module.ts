import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PushModule } from '../push/push.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    RealtimeModule,
    PushModule,
    AuditLogsModule,

    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
})
export class ShiftsModule {}
