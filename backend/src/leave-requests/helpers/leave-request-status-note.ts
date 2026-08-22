import {
  BadRequestException,
} from '@nestjs/common';

import type {
  LeaveStatus,
} from './leave-request-service-helpers';

export const MAX_LEAVE_STATUS_NOTE_LENGTH =
  1000;

export function normalizeLeaveStatusNote(
  params: {
    isAdmin: boolean;
    status: LeaveStatus;
    note?: unknown;
  },
) {
  const requiresAdminNote =
    params.isAdmin &&
    (params.status === 'REJECTED' ||
      params.status === 'CANCELLED');

  if (!requiresAdminNote) {
    return null;
  }

  if (
    typeof params.note !== 'string'
  ) {
    throw new BadRequestException(
      'Bemærkning er obligatorisk, når en administrator afviser eller annullerer fravær.',
    );
  }

  const note =
    params.note.trim();

  if (!note) {
    throw new BadRequestException(
      'Bemærkning er obligatorisk, når en administrator afviser eller annullerer fravær.',
    );
  }

  if (
    note.length >
    MAX_LEAVE_STATUS_NOTE_LENGTH
  ) {
    throw new BadRequestException(
      `Bemærkning må højst være ${MAX_LEAVE_STATUS_NOTE_LENGTH} tegn.`,
    );
  }

  return note;
}
