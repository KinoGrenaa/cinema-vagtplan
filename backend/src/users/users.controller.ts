import {
  BadRequestException,
  Body,
  Controller,
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

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllUsers() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.updateUser(Number(id), body);
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
    if (Number(req.user?.id) !== Number(id)) {
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
    if (Number(req.user?.id) !== Number(id)) {
      throw new ForbiddenException(
        'Du kan kun uploade billede til din egen profil',
      );
    }

    if (!file) {
      throw new BadRequestException('Ingen fil uploadet');
    }

    return {
      imageUrl: `http://localhost:3001/uploads/profile-images/${file.filename}`,
    };
  }
}