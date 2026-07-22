import { BadRequestException } from '@nestjs/common';
import {
  isCinemaModuleKey,
  type CinemaModuleKey,
} from './cinema-module-catalog';

export type CinemaModuleUpdate = {
  key: CinemaModuleKey;
  enabled: boolean;
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function normalizeCinemaModuleUpdateBody(
  value: unknown,
) {
  if (!isRecord(value)) {
    throw new BadRequestException(
      'Modulindstillinger mangler',
    );
  }

  const allowedBodyKeys = ['modules'];
  const unknownBodyKeys = Object.keys(
    value,
  ).filter(
    (key) =>
      !allowedBodyKeys.includes(key),
  );

  if (unknownBodyKeys.length > 0) {
    throw new BadRequestException(
      'Modulindstillinger indeholder ukendte felter',
    );
  }

  if (
    !Array.isArray(value.modules) ||
    value.modules.length === 0
  ) {
    throw new BadRequestException(
      'Mindst ét modul skal angives',
    );
  }

  const seenKeys =
    new Set<CinemaModuleKey>();

  const modules = value.modules.map(
    (item): CinemaModuleUpdate => {
      if (!isRecord(item)) {
        throw new BadRequestException(
          'Et modul har et ugyldigt format',
        );
      }

      const unknownKeys = Object.keys(
        item,
      ).filter(
        (key) =>
          !['key', 'enabled'].includes(
            key,
          ),
      );

      if (unknownKeys.length > 0) {
        throw new BadRequestException(
          'Et modul indeholder ukendte felter',
        );
      }

      if (!isCinemaModuleKey(item.key)) {
        throw new BadRequestException(
          'Modulnøglen er ugyldig',
        );
      }

      if (
        typeof item.enabled !==
        'boolean'
      ) {
        throw new BadRequestException(
          'Modulstatus skal være sand eller falsk',
        );
      }

      if (seenKeys.has(item.key)) {
        throw new BadRequestException(
          'Det samme modul må kun angives én gang',
        );
      }

      seenKeys.add(item.key);

      return {
        key: item.key,
        enabled: item.enabled,
      };
    },
  );

  return {
    modules,
  };
}
