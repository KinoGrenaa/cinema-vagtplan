import { BadRequestException } from '@nestjs/common';

export type SystemErrorSeverity =
  | 'INFO'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL';

export type SystemErrorStatus =
  | 'NEW'
  | 'SEEN'
  | 'RESOLVED'
  | 'IGNORED';

const VALID_SEVERITIES = new Set<SystemErrorSeverity>([
  'INFO',
  'WARNING',
  'ERROR',
  'CRITICAL',
]);

const VALID_STATUSES = new Set<SystemErrorStatus>([
  'NEW',
  'SEEN',
  'RESOLVED',
  'IGNORED',
]);

function normalizeOptionalEnum<T extends string>(
  value: unknown,
  validValues: ReadonlySet<T>,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(message);
  }

  const normalized = value.trim().toUpperCase() as T;

  if (!normalized || !validValues.has(normalized)) {
    throw new BadRequestException(message);
  }

  return normalized;
}

export function normalizeSystemErrorSeverity(value: unknown) {
  return normalizeOptionalEnum(
    value,
    VALID_SEVERITIES,
    'Severity skal være gyldig',
  );
}

export function normalizeSystemErrorStatus(value: unknown) {
  return normalizeOptionalEnum(
    value,
    VALID_STATUSES,
    'Status skal være gyldig',
  );
}

export function normalizeSystemErrorResolutionNote(
  value: unknown,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Intern note er påkrævet');
  }

  const note = value.trim();

  if (!note) {
    throw new BadRequestException('Intern note er påkrævet');
  }

  if (note.length > 2000) {
    throw new BadRequestException(
      'Intern note må højst være 2000 tegn',
    );
  }

  if (note.includes('\u0000')) {
    throw new BadRequestException('Intern note er ugyldig');
  }

  return note;
}
