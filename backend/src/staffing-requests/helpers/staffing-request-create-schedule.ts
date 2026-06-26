import { BadRequestException } from '@nestjs/common';

import {
  CreateStaffingRequestInput,
  parseStaffingRequestDate,
} from './staffing-request-helpers';
import { StaffingRequestShift } from './staffing-request-create-lookups';

export type StaffingRequestSchedule = {
  requestStartTime: Date;
  requestEndTime: Date;
};

type ResolveStaffingRequestScheduleParams = {
  dto: CreateStaffingRequestInput;
  shift: StaffingRequestShift | null;
};

export function resolveStaffingRequestSchedule({
  dto,
  shift,
}: ResolveStaffingRequestScheduleParams): StaffingRequestSchedule {
  const requestStartTime = shift
    ? shift.startTime
    : parseStaffingRequestDate(dto.requestStartTime);
  const requestEndTime = shift
    ? shift.endTime
    : parseStaffingRequestDate(dto.requestEndTime);

  if (!shift && (!requestStartTime || !requestEndTime)) {
    throw new BadRequestException(
      'Vælg dato og tidsinterval for bemandingsbehovet.',
    );
  }

  if (
    requestStartTime &&
    requestEndTime &&
    requestEndTime <= requestStartTime
  ) {
    throw new BadRequestException(
      'Sluttidspunktet skal være efter starttidspunktet.',
    );
  }

  return {
    requestStartTime: requestStartTime!,
    requestEndTime: requestEndTime!,
  };
}
