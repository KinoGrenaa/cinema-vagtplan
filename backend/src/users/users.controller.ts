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

import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private validateUserRoleAccess(currentUser: AuthUser, targetRole?: string) {
    if (currentUser.role !== 'MASTER' && targetRole === 'MASTER') {
      throw new ForbiddenException(
        'Kun master kan oprette eller tildele master-rolle',
      );
    }
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllUsers(@Req() req: any) {
    const currentUser = req.user as AuthUser;

    return this.usersService.findAll(currentUser);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createUser(@Body() body: CreateUserDto, @Req() req: any) {
    const currentUser = req.user as AuthUser;

    this.validateUserRoleAccess(currentUser, body.role);

    if (currentUser.role !== 'MASTER') {
      if (!currentUser.cinemaId) {
        throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
      }

      body.cinemaId = currentUser.cinemaId;
    }

    return this.usersService.createUser(body, currentUser);
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

    return this.usersService.updateUser(Number(id), body, currentUser);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id')
  deleteUser(@Param('id') id: string, @Req() req: any) {
    const currentUser = req.user as AuthUser;

    return this.usersService.deleteUser(Number(id), currentUser);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/reactivate')
  reactivateUser(@Param('id') id: string, @Req() req: any) {
    const currentUser = req.user as AuthUser;

    return this.usersService.reactivateUser(Number(id), currentUser);
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
      profileImage?: string;
      address?: string;
      birthDate?: string | null;
      emergencyPhone?: string;
      skills?: string;
    },
  ) {
    const currentUserId = req.user?.sub ?? req.user?.id;

    if (Number(currentUserId) !== Number(id)) {
      throw new ForbiddenException('Du kan kun redigere din egen profil');
    }

    return this.usersService.updateOwnProfile(Number(id), body);
  }

  @UseGuards(JwtGuard)
  @Post(':id/profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile-images',
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

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Kun JPG, PNG og WEBP er tilladt'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadProfileImage(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const currentUserId = req.user?.sub ?? req.user?.id;

    if (Number(currentUserId) !== Number(id)) {
      throw new ForbiddenException(
        'Du kan kun uploade billede til din egen profil',
      );
    }

    if (!file) {
      throw new BadRequestException('Ingen fil uploadet');
    }

    return {
      imageUrl: `/uploads/profile-images/${file.filename}`,
    };
  }

  @UseGuards(JwtGuard)
  @Patch(':id/theme')
  updateTheme(@Param('id') id: string, @Body() body: { theme: string }) {
    return this.usersService.updateTheme(Number(id), body.theme);
  }
}
