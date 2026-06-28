import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { JobFunctionsController } from './job-functions.controller';
import { JobFunctionsService } from './job-functions.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [JobFunctionsController],
  providers: [JobFunctionsService],
})
export class JobFunctionsModule {}
