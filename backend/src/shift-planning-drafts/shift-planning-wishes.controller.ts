import {
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
import { parseRequiredPositiveInteger } from '../common/query-validation';
import { ShiftPlanningWishesService } from './shift-planning-wishes.service';

@Controller('shift-planning-wishes')
export class ShiftPlanningWishesController {
  constructor(
    private readonly shiftPlanningWishesService: ShiftPlanningWishesService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('mine')
  listMine(@Req() req: any) {
    return this.shiftPlanningWishesService.listMine(req.user);
  }

  @UseGuards(JwtGuard)
  @Post('items/:itemId')
  createWish(@Req() req: any, @Param('itemId') itemId: string) {
    return this.shiftPlanningWishesService.createWish(
      req.user,
      parseRequiredPositiveInteger(
        itemId,
        'Kladdevagt skal være et gyldigt ID.',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Delete('items/:itemId')
  withdrawWish(@Req() req: any, @Param('itemId') itemId: string) {
    return this.shiftPlanningWishesService.withdrawWish(
      req.user,
      parseRequiredPositiveInteger(
        itemId,
        'Kladdevagt skal være et gyldigt ID.',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('drafts/:draftId')
  getDraftOverview(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningWishesService.getDraftOverview(
      req.user,
      parseRequiredPositiveInteger(
        draftId,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post('drafts/:draftId/open')
  openRound(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.shiftPlanningWishesService.openRound(
      req.user,
      parseRequiredPositiveInteger(
        draftId,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      cinemaId,
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Post('drafts/:draftId/close')
  closeRound(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningWishesService.closeRound(
      req.user,
      parseRequiredPositiveInteger(
        draftId,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post('drafts/:draftId/items/:itemId/enabled')
  setItemWishEnabled(
    @Req() req: any,
    @Param('draftId') draftId: string,
    @Param('itemId') itemId: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Body() body: unknown,
  ) {
    return this.shiftPlanningWishesService.setItemWishEnabled(
      req.user,
      parseRequiredPositiveInteger(
        draftId,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      parseRequiredPositiveInteger(
        itemId,
        'Kladdevagt skal være et gyldigt ID.',
      ),
      cinemaId,
      body,
    );
  }
}
