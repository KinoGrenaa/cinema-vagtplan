import { normalizeDashboardHorizonDays } from './helpers/user-dashboard-preference';
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
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'path';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { validateUploadedImageFile } from '../common/file-validation/image-file-signature';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserCinemaMembershipsDto } from './dto/update-user-cinema-memberships.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  getAuthenticatedUserId,
  normalizeUserCinemaMembershipIds,
  normalizeUserTheme,
  parseOptionalUserCinemaId,
  parseUserControllerId,
  requireUserSessionCinemaId,
} from './helpers/user-controller-input';
import { UsersService } from './users.service';

export type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

const profileImageExtensionByMime: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const allowedProfileImageExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
];

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private validateUserRoleAccess(
    currentUser: AuthUser,
    targetRole?: string,
  ) {
    if (
      currentUser.role !== 'MASTER' &&
      targetRole === 'MASTER'
    ) {
      throw new ForbiddenException(
        'Kun master kan oprette eller tildele master-rolle',
      );
    }
  }

  private async removeManagedProfileImage(
    imageUrl?: string | null,
  ) {
    const prefix = '/uploads/profile-images/';

    if (!imageUrl?.startsWith(prefix)) {
      return;
    }

    const fileName = basename(imageUrl.slice(prefix.length));

    if (!fileName) {
      return;
    }

    try {
      await unlink(
        join(
          process.cwd(),
          'uploads',
          'profile-images',
          fileName,
        ),
      );
    } catch {
      // File cleanup must not turn a valid request into an error.
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllUsers(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.usersService.findAll(
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get('me/profile')
  getOwnProfile(@Req() req: any) {
    return this.usersService.findOwnProfile(
      getAuthenticatedUserId(
        req.user?.sub ?? req.user?.id,
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('me/cinema-memberships')
  getOwnCinemaMemberships(@Req() req: any) {
    return this.usersService.findOwnCinemaMemberships(
      getAuthenticatedUserId(
        req.user?.sub ?? req.user?.id,
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get(':id/job-functions')
  getUserJobFunctions(
    @Param('id') id: string,
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.usersService.findJobFunctions(
      parseUserControllerId(id),
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Put(':id/job-functions')
  replaceUserJobFunctions(
    @Param('id') id: string,
    @Body() body: { jobFunctionIds?: Array<number | string>; cinemaId?: number },
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.usersService.replaceJobFunctions(
      parseUserControllerId(id),
      body ?? {},
      req.user as AuthUser,
      parseOptionalUserCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('MASTER')
  @Get(':id/cinema-memberships')
  getUserCinemaMemberships(@Param('id') id: string) {
    return this.usersService.findManagedCinemaMemberships(
      parseUserControllerId(id),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('MASTER')
  @Patch(':id/cinema-memberships')
  updateUserCinemaMemberships(
    @Param('id') id: string,
    @Body() body: UpdateUserCinemaMembershipsDto,
    @Req() req: any,
  ) {
    return this.usersService.updateManagedCinemaMemberships(
      parseUserControllerId(id),
      normalizeUserCinemaMembershipIds(body?.cinemaIds),
      req.user as AuthUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createUser(
    @Body() body: CreateUserDto,
    @Req() req: any,
  ) {
    const currentUser = req.user as AuthUser;

    this.validateUserRoleAccess(currentUser, body.role);

    if (currentUser.role === 'MASTER') {
      return this.usersService.createUser(
        body,
        currentUser,
      );
    }

    const cinemaId = requireUserSessionCinemaId(
      currentUser.cinemaId,
    );

    return this.usersService.createUser(
      {
        ...body,
        cinemaId,
      },
      currentUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() req: any,
  ) {
    const currentUser = req.user as AuthUser;

    this.validateUserRoleAccess(currentUser, body.role);

    return this.usersService.updateUser(
      parseUserControllerId(id),
      body,
      currentUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id')
  deleteUser(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.usersService.deleteUser(
      parseUserControllerId(id),
      req.user as AuthUser,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/reactivate')
  reactivateUser(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.usersService.reactivateUser(
      parseUserControllerId(id),
      req.user as AuthUser,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/profile')
  updateOwnProfile(
    @Param('id') id: string,
    @Req() req: any,
    @Body()
    body: {
      email: string;
      phone?: string;
      password?: string;
      address?: string;
      birthDate?: string | null;
      emergencyPhone?: string;
      skills?: string;
    },
  ) {
    const userId = parseUserControllerId(id);
    const currentUserId = getAuthenticatedUserId(
      req.user?.sub ?? req.user?.id,
    );

    if (currentUserId !== userId) {
      throw new ForbiddenException(
        'Du kan kun redigere din egen profil',
      );
    }

    const {
      email,
      phone,
      password,
      address,
      birthDate,
      emergencyPhone,
      skills,
    } = body;

    return this.usersService.updateOwnProfile(userId, {
      email,
      phone,
      password,
      address,
      birthDate,
      emergencyPhone,
      skills,
    });
  }

  @UseGuards(JwtGuard)
  @Post(':id/profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile-images',
        filename: (_, file, callback) => {
          const uniqueName =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension =
            profileImageExtensionByMime[file.mimetype];

          if (!extension) {
            return callback(
              new BadRequestException(
                'Kun JPG, PNG og WEBP er tilladt',
              ),
              '',
            );
          }

          callback(null, `${uniqueName}${extension}`);
        },
      }),
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const extension = extname(
          file.originalname,
        ).toLowerCase();

        if (
          !profileImageExtensionByMime[file.mimetype] ||
          !allowedProfileImageExtensions.includes(extension)
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
  async uploadProfileImage(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = file
      ? `/uploads/profile-images/${file.filename}`
      : null;
    let currentProfile;

    try {
      const userId = parseUserControllerId(id);
      const currentUserId = getAuthenticatedUserId(
        req.user?.sub ?? req.user?.id,
      );

      if (currentUserId !== userId) {
        throw new ForbiddenException(
          'Du kan kun uploade billede til din egen profil',
        );
      }

      if (!file || !imageUrl) {
        throw new BadRequestException('Ingen fil uploadet');
      }

      await validateUploadedImageFile(file);
      currentProfile =
        await this.usersService.findOwnProfile(userId);

      await this.usersService.updateOwnProfile(userId, {
        profileImage: imageUrl,
      });
    } catch (error) {
      await this.removeManagedProfileImage(imageUrl);
      throw error;
    }

    if (currentProfile.profileImage !== imageUrl) {
      await this.removeManagedProfileImage(
        currentProfile.profileImage,
      );
    }

    return {
      imageUrl,
    };
  }

  @UseGuards(JwtGuard)
  @Patch(':id/theme')
  updateTheme(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { theme?: unknown },
  ) {
    const userId = parseUserControllerId(id);
    const currentUserId = getAuthenticatedUserId(
      req.user?.sub ?? req.user?.id,
    );

    if (currentUserId !== userId) {
      throw new ForbiddenException(
        'Du kan kun ændre tema for din egen bruger',
      );
    }

    return this.usersService.updateTheme(
      userId,
      normalizeUserTheme(body?.theme),
    );
  }


  @UseGuards(JwtGuard)
  @Get('me/dashboard-horizon')
  getOwnDashboardHorizon(
    @Req() req: any,
  ) {
    return this.usersService.findDashboardHorizonPreference(
      getAuthenticatedUserId(
        req.user?.sub ?? req.user?.id,
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Patch('me/dashboard-horizon')
  updateOwnDashboardHorizon(
    @Req() req: any,
    @Body() body: { days?: unknown },
  ) {
    return this.usersService.updateDashboardHorizonPreference(
      getAuthenticatedUserId(
        req.user?.sub ?? req.user?.id,
      ),
      normalizeDashboardHorizonDays(
        body?.days,
      ),
    );
  }
}
