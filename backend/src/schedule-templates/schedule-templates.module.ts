import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleTemplatesController } from './schedule-templates.controller';
import { ScheduleTemplatesService } from './schedule-templates.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [ScheduleTemplatesController],
  providers: [ScheduleTemplatesService],
})
export class ScheduleTemplatesModule {}
