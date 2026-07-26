import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  normalizeUserListSearch,
  parseUserListIncludeInactive,
  parseUserListPage,
  parseUserListSort,
} from './helpers/user-list-input';
import { parseOptionalUserCinemaId } from './helpers/user-controller-input';
import { AuthUser } from './helpers/user-service-helpers';
import { UserListService } from './user-list.service';

@Controller('users')
export class UserListController {
  constructor(
    private readonly userListService: UserListService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('page')
  findPage(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('sort') sort?: string,
  ) {
    return this.userListService.findPage(
      req.user as AuthUser,
      {
        cinemaId: parseOptionalUserCinemaId(cinemaId),
        page: parseUserListPage(page),
        search: normalizeUserListSearch(search),
        includeInactive:
          parseUserListIncludeInactive(includeInactive),
        sort: parseUserListSort(sort),
      },
    );
  }
}
