import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MasterUsersController } from './master-users.controller';
import { MasterUsersService } from './master-users.service';
import { UserCinemaDefaultController } from './user-cinema-default.controller';
import { UserCinemaMembershipConfigurationController } from './user-cinema-membership-configuration.controller';
import { UserCinemaMembershipConfigurationService } from './user-cinema-membership-configuration.service';
import { UserCinemaMembershipStatusController } from './user-cinema-membership-status.controller';
import { UserCinemaMembershipStatusService } from './user-cinema-membership-status.service';
import { UserCinemaProfileController } from './user-cinema-profile.controller';
import { UserCinemaProfileService } from './user-cinema-profile.service';
import { UserListController } from './user-list.controller';
import { UserListService } from './user-list.service';
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
    MasterUsersController,
    UserListController,
    UserCinemaDefaultController,
    UserCinemaMembershipConfigurationController,
    UserCinemaMembershipStatusController,
    UserCinemaProfileController,
  ],
  providers: [
    UsersService,
    MasterUsersService,
    UserListService,
    UserCinemaMembershipConfigurationService,
    UserCinemaMembershipStatusService,
    UserCinemaProfileService,
  ],
  exports: [UsersService],
})
export class UsersModule {}
