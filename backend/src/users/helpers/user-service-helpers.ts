import { ForbiddenException } from '@nestjs/common';

export type UserRole = 'MASTER' | 'ADMIN' | 'EMPLOYEE';
export type EmploymentType = 'HOURLY' | 'SALARIED';

export type AuthUser = {
  sub?: number;
  id?: number;
  email: string;
  role: UserRole;
  cinemaId: number | null;
};

type UserAccessTarget = {
  role: UserRole;
  cinemaId: number | null;
};

export function getActorUserId(currentUser?: AuthUser) {
  return currentUser?.sub ?? currentUser?.id;
}

export function ensureSameCinemaOrMaster(
  currentUser: AuthUser,
  targetCinemaId: number | null,
) {
  if (currentUser.role === 'MASTER') {
    return;
  }

  if (!currentUser.cinemaId || !targetCinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne biograf');
  }

  if (currentUser.cinemaId !== targetCinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne biograf');
  }
}

export function ensureCanModifyTargetUser(
  currentUser: AuthUser,
  targetUser: UserAccessTarget,
) {
  ensureSameCinemaOrMaster(currentUser, targetUser.cinemaId);

  if (currentUser.role !== 'MASTER' && targetUser.role === 'MASTER') {
    throw new ForbiddenException('Kun master kan ændre master-brugere');
  }
}
