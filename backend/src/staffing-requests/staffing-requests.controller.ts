import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { StaffingRequestsService } from './staffing-requests.service';

type AuthRequest = {
  user: {
    sub: number;
    email: string;
    role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
    cinemaId: number | null;
  };
};

function parseOptionalBodyId(
  value: unknown,
  message: string,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return parseRequiredPositiveInteger(
    value,
    message,
  );
}

@UseGuards(JwtGuard)
@Controller('staffing-requests')
export class StaffingRequestsController {
  constructor(
    private readonly staffingRequestsService: StaffingRequestsService,
  ) {}

  @Get()
  findAll(
    @Req() req: AuthRequest,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Get('mine')
  findMine(
    @Req() req: AuthRequest,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.findMine(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Post()
  create(
    @Req() req: AuthRequest,
    @Body() dto: CreateStaffingRequestDto,
  ) {
    return this.staffingRequestsService.create(
      req.user,
      {
        ...dto,
        cinemaId: parseOptionalBodyId(
          dto.cinemaId,
          'Biograf skal være et gyldigt ID',
        ),
      },
    );
  }

  @Patch(':id/accept')
  accept(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.accept(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Bemandingsforespørgsel skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Patch(':id/reject')
  reject(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.reject(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Bemandingsforespørgsel skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Patch(':id/cancel')
  cancel(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.staffingRequestsService.cancel(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Bemandingsforespørgsel skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
