import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    RealtimeModule,
    PushModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
})
export class ShiftsModule {}