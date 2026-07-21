import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { ShiftPlanningDraftPublicationService } from './shift-planning-drafts-publication.service';

function parseOptionalCinemaIdAsString(value: unknown) {
  const cinemaId = parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID.',
  );

  return cinemaId === undefined ? undefined : String(cinemaId);
}

@Controller('shift-planning-drafts')
export class ShiftPlanningDraftPublicationController {
  constructor(
    private shiftPlanningDraftPublicationService: ShiftPlanningDraftPublicationService,
  ) {}

  @UseGuards(JwtGuard)
  @Get(':id/publication-preview')
  getPublicationPreview(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftPublicationService.getPublicationPreview(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      parseOptionalCinemaIdAsString(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/publish')
  publishDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.shiftPlanningDraftPublicationService.publishDraft(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      parseOptionalCinemaIdAsString(cinemaId),
      body,
    );
  }
}
