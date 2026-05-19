import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { UsersService } from './users.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllUsers() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Post()
  createUser(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      role?: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
      cinemaId: number;
    },
  ) {
    return this.usersService.createUser(body);
  }
  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
@Patch(':id')
updateUser(
  @Param('id') id: string,
  @Body()
  body: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
    password?: string;
    profileImage?: string;
    address?: string;
    birthDate?: string | null;
    emergencyPhone?: string;
    hireDate?: string | null;
    skills?: string;
    notes?: string;
  },
) {
  return this.usersService.updateUser(Number(id), body);
}
@UseGuards(JwtGuard)
@Patch(':id/profile')
updateOwnProfile(
  @Param('id') id: string,
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
  return this.usersService.updateOwnProfile(Number(id), body);
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

        callback(
          null,
          `${uniqueName}${extname(file.originalname)}`,
        );
      },
    }),
  }),
)
uploadProfileImage(
  @UploadedFile() file: Express.Multer.File,
) {
  return {
    imageUrl: `http://localhost:3001/uploads/profile-images/${file.filename}`,
  };
}
}
