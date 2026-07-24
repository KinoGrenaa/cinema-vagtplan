import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { UserCinemaDefaultController } from './user-cinema-default.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: {
        expiresIn: '7d',
      },
    }),
    AuditLogsModule,
  ],
  controllers: [
    UsersController,
    UserCinemaDefaultController,
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
