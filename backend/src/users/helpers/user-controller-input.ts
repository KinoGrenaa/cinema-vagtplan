import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../../common/query-validation';

export function parseUserControllerId(value: unknown) {
  return parseRequiredPositiveInteger(
    value,
    'Bruger skal være et gyldigt ID',
  );
}

export function getAuthenticatedUserId(value: unknown) {
  try {
    return parseRequiredPositiveInteger(
      value,
      'Brugeren kunne ikke identificeres',
    );
  } catch {
    throw new ForbiddenException(
      'Brugeren kunne ikke identificeres',
    );
  }
}

export function parseOptionalUserCinemaId(value: unknown) {
  return parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID',
  );
}

export function requireUserSessionCinemaId(value: unknown) {
  try {
    return parseRequiredPositiveInteger(
      value,
      'Din bruger er ikke tilknyttet en biograf',
    );
  } catch {
    throw new ForbiddenException(
      'Din bruger er ikke tilknyttet en biograf',
    );
  }
}

export function normalizeUserCinemaMembershipIds(
  value: unknown,
) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new BadRequestException(
      'Vælg mindst én gyldig biograf',
    );
  }

  if (value.length > 1000) {
    throw new BadRequestException(
      'Der er valgt for mange biografer',
    );
  }

  const cinemaIds = value.map((cinemaId) =>
    parseRequiredPositiveInteger(
      cinemaId,
      'Biograf skal være et gyldigt ID',
    ),
  );

  if (new Set(cinemaIds).size !== cinemaIds.length) {
    throw new BadRequestException(
      'Den samme biograf må kun vælges én gang',
    );
  }

  return cinemaIds;
}

export function normalizeUserTheme(value: unknown) {
  if (typeof value !== 'string') {
    throw new BadRequestException('Tema skal være tekst');
  }

  const theme = value.trim();

  if (!theme) {
    throw new BadRequestException('Tema er påkrævet');
  }

  if (theme.length > 32) {
    throw new BadRequestException(
      'Tema må højst være 32 tegn',
    );
  }

  if (/[\u0000-\u001f\u007f]/.test(theme)) {
    throw new BadRequestException(
      'Tema indeholder ugyldige tegn',
    );
  }

  return theme;
}
