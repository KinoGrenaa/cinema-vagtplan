import { BadRequestException } from '@nestjs/common';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../../common/query-validation';

const MAX_AUDIT_ENTITY_TYPE_LENGTH = 100;
const AUDIT_ENTITY_TYPE_PATTERN =
  /^[A-Za-z][A-Za-z0-9_.:-]*$/;

export function parseOptionalAuditCinemaId(
  value: unknown,
) {
  return parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID',
  );
}

export function parseAuditEntityId(
  value: unknown,
) {
  return parseRequiredPositiveInteger(
    value,
    'Entitet skal være et gyldigt ID',
  );
}

export function normalizeAuditEntityType(
  value: unknown,
) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length >
      MAX_AUDIT_ENTITY_TYPE_LENGTH ||
    !AUDIT_ENTITY_TYPE_PATTERN.test(value)
  ) {
    throw new BadRequestException(
      'Entitetstype er ugyldig',
    );
  }

  return value;
}
