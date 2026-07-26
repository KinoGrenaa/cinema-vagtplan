import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { EmployeeDocumentListService } from './employee-document-list.service';
import {
  parseEmployeeDocumentUserId,
  parseOptionalEmployeeDocumentCinemaId,
} from './helpers/employee-document-input';
import {
  normalizeEmployeeDocumentSearch,
  parseEmployeeDocumentListPage,
  parseEmployeeDocumentListSort,
  parseEmployeeDocumentListType,
} from './helpers/employee-document-list-input';

@Controller('employee-documents')
export class EmployeeDocumentListController {
  constructor(
    private readonly employeeDocumentListService: EmployeeDocumentListService,
  ) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Get('user/:userId/page')
  findForUser(
    @Req() req: any,
    @Param('userId') userId: string,
    @Query('cinemaId') cinemaId?: string,
    @Query('page') page?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sort') sort?: string,
  ) {
    return this.employeeDocumentListService.findForUser(
      req.user,
      parseEmployeeDocumentUserId(userId),
      {
        cinemaId: parseOptionalEmployeeDocumentCinemaId(cinemaId),
        page: parseEmployeeDocumentListPage(page),
        search: normalizeEmployeeDocumentSearch(search),
        type: parseEmployeeDocumentListType(type),
        sort: parseEmployeeDocumentListSort(sort),
      },
    );
  }
}
