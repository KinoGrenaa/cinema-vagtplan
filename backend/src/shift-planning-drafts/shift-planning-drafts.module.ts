import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ShiftPlanningDraftsController } from './shift-planning-drafts.controller';
import { ShiftPlanningDraftPublicationController } from './shift-planning-drafts-publication.controller';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';
import { ShiftPlanningDraftPublicationService } from './shift-planning-drafts-publication.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ShiftPlanningDraftsController,
    ShiftPlanningDraftPublicationController,
  ],
  providers: [ShiftPlanningDraftsService, ShiftPlanningDraftPublicationService],
})
export class ShiftPlanningDraftsModule {}
