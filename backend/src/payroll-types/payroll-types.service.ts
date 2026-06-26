import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
} from './helpers/payroll-type-access';
import { createPayrollType } from './helpers/payroll-type-create-flow';
import { removePayrollType, updatePayrollType } from './helpers/payroll-type-mutation-flow';
import { findPayrollTypes } from './helpers/payroll-type-read-flow';

@Injectable()
export class PayrollTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: AuthUser, selectedCinemaId?: CinemaContextValue) {
    return findPayrollTypes(this.prisma, user, selectedCinemaId);
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      payrollCode: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      cinemaId?: CinemaContextValue;
    },
  ) {
    return createPayrollType(this.prisma, user, data);
  }

  async update(
    user: AuthUser,
    id: number,
    data: {
      name?: string;
      payrollCode?: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      isActive?: boolean;
      cinemaId?: CinemaContextValue;
    },
    selectedCinemaId?: CinemaContextValue,
  ) {
    return updatePayrollType(
      this.prisma,
      user,
      id,
      data,
      selectedCinemaId,
    );
  }

  async remove(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    return removePayrollType(this.prisma, user, id, selectedCinemaId);
  }
}
