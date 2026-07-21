import { BadRequestException } from '@nestjs/common';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../../common/query-validation';

export function parseEmployeeDocumentId(
  value: unknown,
  message = 'Dokument skal være et gyldigt ID',
) {
  return parseRequiredPositiveInteger(value, message);
}

export function parseEmployeeDocumentUserId(value: unknown) {
  return parseRequiredPositiveInteger(
    value,
    'Bruger skal være et gyldigt ID',
  );
}

export function parseOptionalEmployeeDocumentCinemaId(
  value: unknown,
) {
  return parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID',
  );
}

export function normalizeEmployeeDocumentTitle(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Titel er påkrævet');
  }

  const title = value.trim();

  if (!title) {
    throw new BadRequestException('Titel er påkrævet');
  }

  if (title.length > 200) {
    throw new BadRequestException(
      'Titel må højst være 200 tegn',
    );
  }

  if (/[\u0000-\u001f\u007f]/.test(title)) {
    throw new BadRequestException('Titel indeholder ugyldige tegn');
  }

  return title;
}
