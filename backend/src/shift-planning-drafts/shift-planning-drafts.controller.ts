import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

@Controller('shift-planning-drafts')
export class ShiftPlanningDraftsController {
  constructor(private shiftPlanningDraftsService: ShiftPlanningDraftsService) {}

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  @UseGuards(JwtGuard)
  @Get()
  findMonth(
    @Req() req,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.findMonth(
      req.user,
      year,
      month,
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post('prepare')
  prepareMonth(
    @Req() req,
    @Body() body,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.prepareMonth(req.user, {
      ...body,
      year: body?.year ?? year,
      month: body?.month ?? month,
      cinemaId: body?.cinemaId ?? cinemaId,
    });
  }

  @UseGuards(JwtGuard)
  @Get(':id/validate')
  validateDraft(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.validateDraft(
      req.user,
      this.parseRequiredId(id, 'Planlægningskladde skal være et gyldigt ID.'),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  deleteDraft(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.deleteDraft(
      req.user,
      this.parseRequiredId(id, 'Forhåndsvisning skal være et gyldigt ID.'),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/publication-preview')
  publicationPreview(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.publicationPreview(
      req.user,
      this.parseRequiredId(id, 'Forhåndsvisning skal være et gyldigt ID.'),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/publish')
  publishDraft(
    @Req() req,
    @Param('id') id: string,
    @Body() body,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.publishDraft(
      req.user,
      this.parseRequiredId(id, 'Forhåndsvisning skal være et gyldigt ID.'),
      body,
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(
    @Req() req,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.findOne(
      req.user,
      this.parseRequiredId(id, 'Planlægningskladde skal være et gyldigt ID.'),
      cinemaId,
    );
  }
}
