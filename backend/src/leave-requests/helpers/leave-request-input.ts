import { BadRequestException } from '@nestjs/common';
import { LEAVE_REQUEST_REASON_MAX_LENGTH } from '../dto/create-leave-request.dto';
import {
  validateLeaveRequestDates,
} from './leave-request-service-helpers';

export type LeaveRequestCreateInput = {
  startDate: string;
  endDate: string;
  reason?: string;
  cinemaId?: number;
  userId?: number;
};

function getOptionalPositiveId(
  value: unknown,
  fieldName: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException(
      `${fieldName} skal være et gyldigt ID`,
    );
  }

  return id;
}

function getRequiredDate(
  value: unknown,
  fieldName: string,
) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new BadRequestException(
      `${fieldName} skal være en gyldig dato`,
    );
  }

  return new Date(value);
}

function normalizeReason(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Begrundelsen skal være tekst',
    );
  }

  const reason = value.trim();

  if (
    reason.length >
    LEAVE_REQUEST_REASON_MAX_LENGTH
  ) {
    throw new BadRequestException(
      `Begrundelsen må højst være ${LEAVE_REQUEST_REASON_MAX_LENGTH} tegn`,
    );
  }

  return reason || undefined;
}

export function normalizeLeaveRequestCreateInput(
  input: LeaveRequestCreateInput,
) {
  const startDate = getRequiredDate(
    input?.startDate,
    'Starttidspunkt',
  );
  const endDate = getRequiredDate(
    input?.endDate,
    'Sluttidspunkt',
  );

  validateLeaveRequestDates(startDate, endDate);

  return {
    startDate,
    endDate,
    reason: normalizeReason(input?.reason),
    cinemaId: getOptionalPositiveId(
      input?.cinemaId,
      'Biograf',
    ),
    userId: getOptionalPositiveId(
      input?.userId,
      'Medarbejder',
    ),
  };
}
