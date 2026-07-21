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
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { validateUploadedImageFile } from '../common/file-validation/image-file-signature';
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
import { CinemasService } from './cinemas.service';

const cinemaLogoExtensionByMime: Record<
  string,
  string
> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Controller('cinemas')
export class CinemasController {
  constructor(
    private cinemasService: CinemasService,
  ) {}

  private async removeUploadedLogo(
    file?: Express.Multer.File,
  ) {
    if (!file?.path) {
      return;
    }

    try {
      await unlink(file.path);
    } catch {
      // Upload-fejlen må ikke skjules af en efterfølgende oprydningsfejl.
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  findAll(@Req() req: any) {
    const user =
      req.user as CinemaControllerUser;

    ensureCinemaMaster(user);

    return this.cinemasService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;

    ensureCinemaMaster(user);

    return this.cinemasService.create(
      normalizeCreateCinemaBody(body),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;
    const cinemaId =
      parseCinemaControllerId(id);

    ensureCinemaReadAccess(
      user,
      cinemaId,
    );

    return this.cinemasService.findOne(
      cinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Post(':id/logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination:
          './uploads/cinema-logos',
        filename: (
          _,
          file,
          callback,
        ) => {
          const uniqueName =
            Date.now() +
            '-' +
            Math.round(
              Math.random() * 1e9,
            );
          const extension =
            cinemaLogoExtensionByMime[
              file.mimetype
            ];

          if (!extension) {
            return callback(
              new BadRequestException(
                'Kun JPG, PNG og WEBP er tilladt',
              ),
              '',
            );
          }

          callback(
            null,
            `${uniqueName}${extension}`,
          );
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (
        _,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        const extension = extname(
          file.originalname,
        ).toLowerCase();

        if (
          !allowedTypes.includes(
            file.mimetype,
          ) ||
          ![
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
          ].includes(extension)
        ) {
          return callback(
            new BadRequestException(
              'Kun JPG, PNG og WEBP er tilladt',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile()
    file: Express.Multer.File,
    @Req() req: any,
  ) {
    try {
      const user =
        req.user as CinemaControllerUser;
      const cinemaId =
        parseCinemaControllerId(id);

      ensureCinemaManageAccess(
        user,
        cinemaId,
      );

      if (!file) {
        throw new BadRequestException(
          'Ingen fil uploadet',
        );
      }

      await validateUploadedImageFile(file);

      return await this.cinemasService.updateLogo(
        cinemaId,
        `/uploads/cinema-logos/${file.filename}`,
      );
    } catch (error) {
      await this.removeUploadedLogo(file);
      throw error;
    }
  }

  @UseGuards(JwtGuard)
  @Delete(':id/logo')
  deleteLogo(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;
    const cinemaId =
      parseCinemaControllerId(id);

    ensureCinemaManageAccess(
      user,
      cinemaId,
    );

    return this.cinemasService.updateLogo(
      cinemaId,
      null,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  updateSettings(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: any,
  ) {
    const user =
      req.user as CinemaControllerUser;
    const cinemaId =
      parseCinemaControllerId(id);

    ensureCinemaManageAccess(
      user,
      cinemaId,
    );

    const normalizedBody =
      normalizeCinemaSettingsBody(body);

    if (
      normalizedBody.name !== undefined &&
      user.role !== 'MASTER'
    ) {
      throw new BadRequestException(
        'Kun MASTER kan ændre biografens navn',
      );
    }

    return this.cinemasService.updateSettings(
      cinemaId,
      normalizedBody,
    );
  }
}
