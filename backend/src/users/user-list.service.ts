import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  findCinemaUsersPage,
  type UserListOptions,
} from './helpers/user-list-query';
import { AuthUser } from './helpers/user-service-helpers';

@Injectable()
export class UserListService {
  constructor(private readonly prisma: PrismaService) {}

  findPage(
    currentUser: AuthUser,
    options: UserListOptions,
  ) {
    return findCinemaUsersPage(
      this.prisma,
      currentUser,
      options,
    );
  }
}
