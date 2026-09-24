import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ShiftPlanningDraftsController } from './shift-planning-drafts.controller';
import { ShiftPlanningDraftPublicationController } from './shift-planning-drafts-publication.controller';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';
import { ShiftPlanningDraftPublicationService } from './shift-planning-drafts-publication.service';
import { ShiftPlanningWishesController } from './shift-planning-wishes.controller';
import { ShiftPlanningWishesService } from './shift-planning-wishes.service';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ShiftPlanningDraftsController,
    ShiftPlanningDraftPublicationController,
    ShiftPlanningWishesController,
  ],
  providers: [
    ShiftPlanningDraftsService,
    ShiftPlanningDraftPublicationService,
    ShiftPlanningWishesService,
  ],
})
export class ShiftPlanningDraftsModule {}
