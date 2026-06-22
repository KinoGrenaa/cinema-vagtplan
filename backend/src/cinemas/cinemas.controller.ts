import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CinemasService } from './cinemas.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { hasPermission } from '../auth/permissions';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
  canManageCinemaSettings?: boolean;
};

type CreateCinemaBody = {
  name?: string;
};

type UpdateCinemaSettingsBody = {
  name?: string;
  logoUrl?: string | null;
  allowShiftTradePool?: boolean;
  allowShiftTradeDirect?: boolean;
  aiEnabled?: boolean;
  payrollRulesEnabled?: boolean;
  clockInDeviationToleranceMinutes?: number;
  clockOutDeviationToleranceMinutes?: number;
  requireNoteForClockInDeviation?: boolean;
  requireNoteForClockOutDeviation?: boolean;
  requireNoteForManualEntry?: boolean;
  payrollOvertimeEnabled?: boolean;
  plannedOvertimeEnabled?: boolean;
  dailyOvertimeEnabled?: boolean;
  weeklyOvertimeEnabled?: boolean;
  dailyOvertimeThreshold?: number;
  weeklyOvertimeThreshold?: number;
  payrollPeriodModel?: 'CALENDAR_MONTH' | 'FIXED_DAY_TO_DAY' | 'BIWEEKLY';
  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: string | null;
  payrollPayoutRule?: 'LAST_WEEKDAY_OF_MONTH' | 'FIXED_DAY_OF_MONTH';
  payrollPayoutDay?: number;
};

@Controller('cinemas')
export class CinemasController {
  constructor(private cinemasService: CinemasService) {}

  private parseCinemaId(id: string) {
    const cinemaId = Number(id);

    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException('Ugyldigt biograf-id');
    }

    return cinemaId;
  }

  private ensureMaster(user: AuthUser) {
    if (user.role !== 'MASTER') {
      throw new ForbiddenException('Kun MASTER har adgang til denne handling');
    }
  }

  private ensureCanManageCinema(user: AuthUser, cinemaId: number) {
    if (
      user.role !== 'MASTER' &&
      (!user.cinemaId || user.cinemaId !== cinemaId)
    ) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
    }

    if (
      user.role !== 'MASTER' &&
      user.role !== 'ADMIN' &&
      !hasPermission(user, 'canManageCinemaSettings')
    ) {
      throw new ForbiddenException(
        'Du har ikke rettighed til at ændre biografindstillinger',
      );
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req: any) {
    const user = req.user as AuthUser;
    this.ensureMaster(user);

    return this.cinemasService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() body: CreateCinemaBody, @Req() req: any) {
    const user = req.user as AuthUser;
    this.ensureMaster(user);

    return this.cinemasService.create({ name: body.name });
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    if (
      user.role !== 'MASTER' &&
      (!user.cinemaId || user.cinemaId !== cinemaId)
    ) {
      throw new ForbiddenException('Du har ikke adgang til denne biograf');
    }

    return this.cinemasService.findOne(cinemaId);
  }

  @UseGuards(JwtGuard)
  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/cinema-logos',
        filename: (_, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedTypes.includes(file.mimetype) ||
          !['.jpg', '.jpeg', '.png', '.webp'].includes(extension)
        ) {
          return callback(
            new BadRequestException('Kun JPG, PNG og WEBP er tilladt'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    this.ensureCanManageCinema(user, cinemaId);

    if (!file) {
      throw new BadRequestException('Ingen fil uploadet');
    }

    return this.cinemasService.updateLogo(
      cinemaId,
      `/uploads/cinema-logos/${file.filename}`,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id/logo')
  deleteLogo(@Param('id') id: string, @Req() req: any) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    this.ensureCanManageCinema(user, cinemaId);

    return this.cinemasService.updateLogo(cinemaId, null);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  updateSettings(
    @Param('id') id: string,
    @Body() body: UpdateCinemaSettingsBody,
    @Req() req: any,
  ) {
    const user = req.user as AuthUser;
    const cinemaId = this.parseCinemaId(id);

    this.ensureCanManageCinema(user, cinemaId);

    if (body.name !== undefined && user.role !== 'MASTER') {
      throw new ForbiddenException('Kun MASTER kan ændre biografens navn');
    }

    return this.cinemasService.updateSettings(cinemaId, {
      ...body,
      payrollPeriodAnchorDate:
        body.payrollPeriodAnchorDate !== undefined
          ? body.payrollPeriodAnchorDate
            ? new Date(body.payrollPeriodAnchorDate)
            : null
          : undefined,
    });
  }
}
