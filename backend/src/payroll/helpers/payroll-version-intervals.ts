import { BadRequestException } from '@nestjs/common';

export type VersionInterval = {
  id: number;
  validFrom: Date;
  validTo: Date | null;
  status?: string;
};

const COPENHAGEN_TIME_ZONE = 'Europe/Copenhagen';
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const representedAsUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return representedAsUtc - date.getTime();
}

function parseCopenhagenDateStart(value: string) {
  const match = dateOnlyPattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const nominalUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);
  const nominalDate = new Date(nominalUtc);
  if (
    nominalDate.getUTCFullYear() !== year ||
    nominalDate.getUTCMonth() !== month - 1 ||
    nominalDate.getUTCDate() !== day
  ) {
    return null;
  }

  let instant = nominalUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getTimeZoneOffsetMilliseconds(
      new Date(instant),
      COPENHAGEN_TIME_ZONE,
    );
    const next = nominalUtc - offset;
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant);
}

export function parsePayrollValidFrom(value: unknown) {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw new BadRequestException('“Gælder fra” skal udfyldes.');
  }
  const date =
    typeof value === 'string' && dateOnlyPattern.test(value)
      ? parseCopenhagenDateStart(value)
      : new Date(value);
  if (!date || Number.isNaN(date.getTime())) {
    throw new BadRequestException('“Gælder fra” er ikke en gyldig dato.');
  }
  return date;
}

export function assertNoVersionOverlap(versions: VersionInterval[]) {
  const sorted = [...versions].sort(
    (left, right) => left.validFrom.getTime() - right.validFrom.getTime(),
  );
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (current.validTo && current.validTo <= current.validFrom) {
      throw new BadRequestException('En lønversion har et ugyldigt gyldighedsinterval.');
    }
    if (next && (!current.validTo || current.validTo > next.validFrom)) {
      throw new BadRequestException('Lønversionernes gyldighedsperioder overlapper.');
    }
  }
}

export function planVersionInsertion(
  versions: VersionInterval[],
  validFrom: Date,
) {
  const activeVersions = versions
    .filter((version) => version.status !== 'CANCELLED')
    .sort((left, right) => left.validFrom.getTime() - right.validFrom.getTime());

  if (
    activeVersions.some(
      (version) => version.validFrom.getTime() === validFrom.getTime(),
    )
  ) {
    throw new BadRequestException(
      'Der findes allerede en version med samme “Gælder fra”-dato.',
    );
  }

  const previous = [...activeVersions]
    .reverse()
    .find((version) => version.validFrom < validFrom) ?? null;
  const next = activeVersions.find((version) => version.validFrom > validFrom) ?? null;

  return {
    previousVersionId: previous?.id ?? null,
    previousValidTo: previous ? validFrom : null,
    newValidTo: next?.validFrom ?? null,
    nextVersionId: next?.id ?? null,
  };
}

export function resolveVersionStatus(
  validFrom: Date,
  validTo: Date | null,
  now = new Date(),
) {
  if (validTo && validTo <= now) return 'SUPERSEDED' as const;
  if (validFrom > now) return 'SCHEDULED' as const;
  return 'ACTIVE' as const;
}

export function findVersionAt<T extends VersionInterval>(
  versions: T[],
  instant: Date,
) {
  return (
    versions.find(
      (version) =>
        version.status !== 'CANCELLED' &&
        version.validFrom <= instant &&
        (!version.validTo || instant < version.validTo),
    ) ?? null
  );
}
