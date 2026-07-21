import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import {
  ensureCinemaManageAccess,
  ensureCinemaMaster,
  ensureCinemaReadAccess,
  type CinemaControllerUser,
} from './helpers/cinema-controller-access';
import {
  normalizeCinemaSettingsBody,
  normalizeCreateCinemaBody,
  parseCinemaControllerId,
} from './helpers/cinema-controller-input';

const invalidCinemaLogoMessage =
  'Kun JPG, PNG og WEBP er tilladt';

@Controller('cinemas')
export class CinemasController {
  constructor(private cinemasService: CinemasService) {}

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req: any) {
    const user = req.user as CinemaControllerUser;
    ensureCinemaMaster(user);
    return this.cinemasService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  create(@Body() body: unknown, @Req() req: any) {
    const user = req.user as CinemaControllerUser;
    ensureCinemaMaster(user);
    return this.cinemasService.create(
      normalizeCreateCinemaBody(body),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user as CinemaControllerUser;
    const cinemaId = parseCinemaControllerId(id);
    ensureCinemaReadAccess(user, cinemaId);
    return this.cinemasService.findOne(cinemaId);
  }

  @UseGuards(JwtGuard)
  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/cinema-logos',
        filename: (_, file, callback) => {
          const uniqueName =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(
            null,
            `${uniqueName}${extname(file.originalname)}`,
          );
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        const extension = extname(
          file.originalname,
        ).toLowerCase();

        if (
          !allowedTypes.includes(file.mimetype) ||
          !['.jpg', '.jpeg', '.png', '.webp'].includes(
            extension,
          )
        ) {
          return callback(
            new BadRequestException(invalidCinemaLogoMessage),
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
    const user = req.user as CinemaControllerUser;
    const cinemaId = parseCinemaControllerId(id);
    ensureCinemaManageAccess(user, cinemaId);

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
    const user = req.user as CinemaControllerUser;
    const cinemaId = parseCinemaControllerId(id);
    ensureCinemaManageAccess(user, cinemaId);
    return this.cinemasService.updateLogo(cinemaId, null);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  updateSettings(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const user = req.user as CinemaControllerUser;
    const cinemaId = parseCinemaControllerId(id);
    ensureCinemaManageAccess(user, cinemaId);
    const settings = normalizeCinemaSettingsBody(body);

    if (settings.name !== undefined && user.role !== 'MASTER') {
      throw new BadRequestException(
        'Kun MASTER kan ændre biografens navn',
      );
    }

    return this.cinemasService.updateSettings(
      cinemaId,
      settings,
    );
  }
}
