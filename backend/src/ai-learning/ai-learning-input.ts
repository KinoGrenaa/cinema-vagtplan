import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { parseRequiredPositiveInteger } from '../common/query-validation';

type JsonCompatible =
  | string
  | number
  | boolean
  | null
  | JsonCompatible[]
  | {
      [key: string]: JsonCompatible;
    };

export type AiLearningEventInput = {
  cinemaId?: unknown;
  type?: unknown;
  severity?: unknown;
  metadata?: unknown;
};

const MAX_EVENT_TYPE_LENGTH = 100;
const MAX_SEVERITY_LENGTH = 30;
const MAX_METADATA_DEPTH = 10;
const MAX_METADATA_NODES = 2_000;
const MAX_METADATA_ARRAY_LENGTH = 500;
const MAX_METADATA_OBJECT_KEYS = 500;
const MAX_METADATA_KEY_LENGTH = 200;
const MAX_METADATA_STRING_LENGTH = 10_000;
const MAX_METADATA_SERIALIZED_LENGTH = 64 * 1024;
const EVENT_IDENTIFIER_PATTERN =
  /^[A-Z][A-Z0-9_:-]*$/;

function normalizeIdentifier(
  value: unknown,
  fieldName: string,
  maximumLength: number,
) {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      `${fieldName} skal være tekst.`,
    );
  }

  const normalizedValue = value
    .trim()
    .toUpperCase();

  if (
    !normalizedValue ||
    normalizedValue.length > maximumLength ||
    !EVENT_IDENTIFIER_PATTERN.test(
      normalizedValue,
    )
  ) {
    throw new BadRequestException(
      `${fieldName} er ugyldig.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalSeverity(
  value: unknown,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return normalizeIdentifier(
    value,
    'Alvorlighedsgrad',
    MAX_SEVERITY_LENGTH,
  );
}

function normalizeJsonValue(
  value: unknown,
  depth: number,
  state: {
    nodes: number;
    seen: WeakSet<object>;
  },
): JsonCompatible {
  state.nodes += 1;

  if (
    depth > MAX_METADATA_DEPTH ||
    state.nodes > MAX_METADATA_NODES
  ) {
    throw new BadRequestException(
      'AI-metadata er for kompleks.',
    );
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    if (
      value.length >
        MAX_METADATA_STRING_LENGTH ||
      value.includes('\u0000')
    ) {
      throw new BadRequestException(
        'AI-metadata indeholder ugyldig tekst.',
      );
    }

    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new BadRequestException(
        'AI-metadata indeholder et ugyldigt tal.',
      );
    }

    return value;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new BadRequestException(
        'AI-metadata indeholder en ugyldig dato.',
      );
    }

    return value.toISOString();
  }

  if (
    typeof value !== 'object' ||
    value === undefined
  ) {
    throw new BadRequestException(
      'AI-metadata skal kunne gemmes som JSON.',
    );
  }

  if (state.seen.has(value)) {
    throw new BadRequestException(
      'AI-metadata må ikke indeholde cirkulære referencer.',
    );
  }

  state.seen.add(value);

  try {
    if (Array.isArray(value)) {
      if (
        value.length >
        MAX_METADATA_ARRAY_LENGTH
      ) {
        throw new BadRequestException(
          'AI-metadata indeholder for mange elementer.',
        );
      }

      return value.map((item) =>
        normalizeJsonValue(
          item,
          depth + 1,
          state,
        ),
      );
    }

    const prototype =
      Object.getPrototypeOf(value);

    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new BadRequestException(
        'AI-metadata skal være et almindeligt JSON-objekt.',
      );
    }

    const entries = Object.entries(value);

    if (
      entries.length >
      MAX_METADATA_OBJECT_KEYS
    ) {
      throw new BadRequestException(
        'AI-metadata indeholder for mange felter.',
      );
    }

    const normalizedObject: {
      [key: string]: JsonCompatible;
    } = {};

    for (const [key, item] of entries) {
      if (
        !key ||
        key.length >
          MAX_METADATA_KEY_LENGTH ||
        key.includes('\u0000')
      ) {
        throw new BadRequestException(
          'AI-metadata indeholder et ugyldigt feltnavn.',
        );
      }

      normalizedObject[key] =
        normalizeJsonValue(
          item,
          depth + 1,
          state,
        );
    }

    return normalizedObject;
  } finally {
    state.seen.delete(value);
  }
}

export function normalizeAiLearningMetadata(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const normalizedValue =
    normalizeJsonValue(value, 0, {
      nodes: 0,
      seen: new WeakSet<object>(),
    });
  const serializedValue = JSON.stringify(
    normalizedValue,
  );

  if (
    serializedValue.length >
    MAX_METADATA_SERIALIZED_LENGTH
  ) {
    throw new BadRequestException(
      'AI-metadata er for stor.',
    );
  }

  return normalizedValue as Prisma.InputJsonValue;
}

export function normalizeAiLearningEvent(
  data: AiLearningEventInput,
) {
  const cinemaId =
    parseRequiredPositiveInteger(
      data?.cinemaId,
      'Biograf skal være et gyldigt ID.',
    );
  const type = normalizeIdentifier(
    data?.type,
    'Eventtype',
    MAX_EVENT_TYPE_LENGTH,
  );
  const severity =
    normalizeOptionalSeverity(
      data?.severity,
    );
  const metadata =
    normalizeAiLearningMetadata(
      data?.metadata,
    );

  return {
    cinemaId,
    type,
    ...(severity === undefined
      ? {}
      : {
          severity,
        }),
    ...(metadata === undefined
      ? {}
      : {
          metadata,
        }),
  };
}

export function parseAiLearningCinemaId(
  value: unknown,
) {
  return parseRequiredPositiveInteger(
    value,
    'Biograf skal være et gyldigt ID.',
  );
}
