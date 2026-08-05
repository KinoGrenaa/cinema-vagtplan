import { Prisma } from '@prisma/client';

function normalizeIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isSafeInteger(value) && value > 0),
    ),
  );
}

export function getSourceMovieShowingIds(metadata: unknown): number[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return [];
  }

  return normalizeIds(
    (metadata as Record<string, unknown>).sourceMovieShowingIds,
  );
}

export function buildPostgresIntegerArraySql(ids: number[]) {
  const normalizedIds = normalizeIds(ids);

  return normalizedIds.length === 0
    ? Prisma.sql`ARRAY[]::integer[]`
    : Prisma.sql`ARRAY[${Prisma.join(normalizedIds)}]::integer[]`;
}
