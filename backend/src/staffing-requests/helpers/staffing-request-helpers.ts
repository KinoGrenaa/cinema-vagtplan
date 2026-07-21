import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { StaffingRequestType } from '@prisma/client';
import { CreateStaffingRequestDto } from '../dto/create-staffing-request.dto';

export type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

export type CreateStaffingRequestInput = CreateStaffingRequestDto & {
  cinemaId?: number | null;
};

export const staffingRequestInclude = {
  cinema: true,
  shift: {
    include: {
      user: true,
      workType: true,
    },
  },
  workType: true,
  requestedByUser: true,
  targetUser: true,
};

const STAFFING_REQUEST_MESSAGE_MAX_LENGTH = 1000;

export function canManageStaffing(user: AuthUser) {
  return user.role === 'MASTER' || user.role === 'ADMIN';
}

export function resolveStaffingCinemaId(
  user: AuthUser,
  selectedCinemaId?: number | null,
) {
  const requestedCinemaId = normalizeOptionalPositiveId(
    selectedCinemaId,
    'Biograf skal være et gyldigt ID',
  );

  if (user.role === 'MASTER') {
    if (!requestedCinemaId) {
      throw new BadRequestException(
        'Vælg en biograf, før du administrerer bemandingsforespørgsler.',
      );
    }

    return requestedCinemaId;
  }

  const sessionCinemaId = normalizeOptionalPositiveId(
    user.cinemaId,
    'Din aktive biograf er ikke gyldig',
  );

  if (!sessionCinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  if (requestedCinemaId && requestedCinemaId !== sessionCinemaId) {
    throw new ForbiddenException('Du har ikke adgang til denne biograf');
  }

  return sessionCinemaId;
}

export function normalizeCreateStaffingRequestInput(
  dto: CreateStaffingRequestInput,
  now = new Date(),
): CreateStaffingRequestInput {
  if (!dto || typeof dto !== 'object') {
    throw new BadRequestException(
      'Bemandingsforespørgslen mangler gyldige oplysninger.',
    );
  }

  if (!Object.values(StaffingRequestType).includes(dto.type)) {
    throw new BadRequestException('Vælg en gyldig type bemandingsforespørgsel.');
  }

  const priority = dto.priority ?? 1;
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
    throw new BadRequestException('Prioritet skal være et helt tal fra 1 til 5.');
  }

  if (dto.aiGenerated !== undefined && typeof dto.aiGenerated !== 'boolean') {
    throw new BadRequestException('AI-markeringen er ikke gyldig.');
  }

  const requestStartTime = normalizeOptionalDateString(
    dto.requestStartTime,
    'Starttidspunktet er ikke gyldigt.',
  );
  const requestEndTime = normalizeOptionalDateString(
    dto.requestEndTime,
    'Sluttidspunktet er ikke gyldigt.',
  );
  const expiresAt = normalizeOptionalDateString(
    dto.expiresAt,
    'Udløbstidspunktet er ikke gyldigt.',
  );

  if (expiresAt && new Date(expiresAt) <= now) {
    throw new BadRequestException('Udløbstidspunktet skal ligge i fremtiden.');
  }

  return {
    ...dto,
    cinemaId: normalizeOptionalPositiveId(
      dto.cinemaId,
      'Biograf skal være et gyldigt ID',
    ),
    shiftId: normalizeOptionalPositiveId(
      dto.shiftId,
      'Vagt skal være et gyldigt ID',
    ),
    targetUserId: normalizeOptionalPositiveId(
      dto.targetUserId,
      'Medarbejder skal være et gyldigt ID',
    ),
    workTypeId: normalizeOptionalPositiveId(
      dto.workTypeId,
      'Jobfunktion skal være et gyldigt ID',
    ),
    priority,
    message: normalizeOptionalMessage(dto.message),
    requestStartTime,
    requestEndTime,
    expiresAt,
    aiGenerated: dto.aiGenerated ?? false,
  };
}

export function parseStaffingRequestDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Tidsintervallet er ikke gyldigt.');
  }

  return date;
}

function normalizeOptionalPositiveId(
  value: number | null | undefined,
  message: string,
) {
  if (value === undefined || value === null) return undefined;

  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(message);
  }

  return value;
}

function normalizeOptionalDateString(
  value: string | null | undefined,
  message: string,
) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }

  const normalized = value.trim();
  const date = new Date(normalized);
  if (!normalized || Number.isNaN(date.getTime())) {
    throw new BadRequestException(message);
  }

  return normalized;
}

function normalizeOptionalMessage(value?: string | null) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new BadRequestException('Beskeden er ikke gyldig.');
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new BadRequestException('Beskeden må ikke være tom.');
  }

  if (normalized.length > STAFFING_REQUEST_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(
      `Beskeden må højst være ${STAFFING_REQUEST_MESSAGE_MAX_LENGTH} tegn.`,
    );
  }

  return normalized;
}
