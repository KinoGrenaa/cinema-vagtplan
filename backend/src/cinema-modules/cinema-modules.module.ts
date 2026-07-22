import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CinemaModuleAccessGuard } from './cinema-module-access.guard';
import { CinemaModulesController } from './cinema-modules.controller';
import { CinemaModulesService } from './cinema-modules.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditLogsModule,
  ],
  controllers: [
    CinemaModulesController,
  ],
  providers: [
    CinemaModulesService,
    CinemaModuleAccessGuard,
  ],
  exports: [
    CinemaModulesService,
    CinemaModuleAccessGuard,
  ],
})
export class CinemaModulesModule {}
