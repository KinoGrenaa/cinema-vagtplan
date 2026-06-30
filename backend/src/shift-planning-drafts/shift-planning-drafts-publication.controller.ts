import {
  BadRequestException,
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
import { ShiftPlanningDraftPublicationService } from './shift-planning-drafts-publication.service';

@Controller('shift-planning-drafts')
export class ShiftPlanningDraftPublicationController {
  constructor(
    private shiftPlanningDraftPublicationService: ShiftPlanningDraftPublicationService,
  ) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @UseGuards(JwtGuard)
  @Get(':id/publication-preview')
  getPublicationPreview(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftPublicationService.getPublicationPreview(
      req.user,
      this.parseRequiredId(id, 'Planlægningskladde skal være et gyldigt ID.'),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/publish')
  publishDraft(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.shiftPlanningDraftPublicationService.publishDraft(
      req.user,
      this.parseRequiredId(id, 'Planlægningskladde skal være et gyldigt ID.'),
      cinemaId,
      body,
    );
  }
}
