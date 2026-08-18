import { BadRequestException } from '@nestjs/common';

export type AutomaticTimeRegistrationMethod =
  | 'PLANNED_SHIFT'
  | 'FIXED_MINUTES';

export function resolveAutomaticClockOut(params: {
  method: AutomaticTimeRegistrationMethod;
  fixedMinutes: number;
  clockIn: Date;
  plannedClockOut: Date;
}) {
  if (
    params.method ===
    'PLANNED_SHIFT'
  ) {
    if (
      params.plannedClockOut <=
      params.clockIn
    ) {
      throw new BadRequestException(
        'Den planlagte fyraften ligger ikke efter den registrerede m\u00f8detid',
      );
    }

    return new Date(
      params.plannedClockOut,
    );
  }

  if (
    !Number.isInteger(
      params.fixedMinutes,
    ) ||
    params.fixedMinutes <= 0
  ) {
    throw new BadRequestException(
      'Fast automatisk arbejdstid skal v\u00e6re st\u00f8rre end 0 minutter',
    );
  }

  return new Date(
    params.clockIn.getTime() +
      params.fixedMinutes *
        60_000,
  );
}
