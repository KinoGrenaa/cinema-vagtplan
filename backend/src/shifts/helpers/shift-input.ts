import { BadRequestException } from '@nestjs/common';
import {
  getOptionalPositiveShiftId,
  getRequiredPositiveShiftId,
  ShiftWriteData,
  validateShiftTimes,
} from './shift-service-helpers';

export const SHIFT_NOTE_MAX_LENGTH = 1000;

export type NormalizedShiftWriteData = {
  startTime: Date;
  endTime: Date;
  note: string | null;
  cinemaId?: number;
  userId: number | null;
  workTypeId: number;
};

function parseShiftDate(
  value: unknown,
  fieldName: string,
) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new BadRequestException(
      `${fieldName} er ikke gyldigt`,
    );
  }

  return new Date(value);
}

function normalizeShiftNote(
  value: unknown,
) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Noten skal være tekst',
    );
  }

  const note = value.trim();

  if (note.length > SHIFT_NOTE_MAX_LENGTH) {
    throw new BadRequestException(
      `Noten må højst være ${SHIFT_NOTE_MAX_LENGTH} tegn`,
    );
  }

  return note || null;
}

export function normalizeShiftWriteData(
  data: ShiftWriteData,
): NormalizedShiftWriteData {
  const startTime = parseShiftDate(
    data?.startTime,
    'Starttidspunkt',
  );
  const endTime = parseShiftDate(
    data?.endTime,
    'Sluttidspunkt',
  );

  validateShiftTimes(startTime, endTime);

  return {
    startTime,
    endTime,
    note: normalizeShiftNote(data?.note),
    cinemaId: getOptionalPositiveShiftId(
      data?.cinemaId,
      'Biograf skal være et gyldigt ID',
    ),
    userId:
      data?.userId === undefined ||
      data?.userId === null
        ? null
        : getRequiredPositiveShiftId(
            data.userId,
            'Medarbejder skal være et gyldigt ID',
          ),
    workTypeId: getRequiredPositiveShiftId(
      data?.workTypeId,
      'Vagttype skal være et gyldigt ID',
    ),
  };
}
