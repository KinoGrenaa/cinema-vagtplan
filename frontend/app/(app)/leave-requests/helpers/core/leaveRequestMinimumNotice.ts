export const DEFAULT_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS =
  1;

export const MAX_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS =
  3650;

const COPENHAGEN_TIME_ZONE =
  "Europe/Copenhagen";

const copenhagenDateFormatter =
  new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        COPENHAGEN_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

function getDatePart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  const value =
    parts.find(
      (part) =>
        part.type === type,
    )?.value;

  if (!value) {
    throw new Error(
      `Kunne ikke beregne dansk dato: ${type}`,
    );
  }

  return value;
}

export function normalizeLeaveRequestMinimumNoticeDays(
  value: unknown,
  fallback =
    DEFAULT_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(
      numericValue,
    ) ||
    numericValue < 0 ||
    numericValue >
      MAX_LEAVE_REQUEST_MINIMUM_NOTICE_DAYS
  ) {
    return fallback;
  }

  return numericValue;
}

export function getCopenhagenLocalDate(
  referenceDate =
    new Date(),
) {
  const parts =
    copenhagenDateFormatter.formatToParts(
      referenceDate,
    );

  const year =
    getDatePart(
      parts,
      "year",
    );
  const month =
    getDatePart(
      parts,
      "month",
    );
  const day =
    getDatePart(
      parts,
      "day",
    );

  return `${year}-${month}-${day}`;
}

export function addCalendarDays(
  isoDate: string,
  days: number,
) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      isoDate,
    );

  if (
    !match ||
    !Number.isInteger(days)
  ) {
    return isoDate;
  }

  const date =
    new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]) +
          days,
      ),
    );

  const year =
    date
      .getUTCFullYear()
      .toString()
      .padStart(4, "0");
  const month =
    String(
      date.getUTCMonth() +
        1,
    ).padStart(
      2,
      "0",
    );
  const day =
    String(
      date.getUTCDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

export function getLeaveRequestMinimumDate(
  minimumNoticeDays: number,
  referenceDate =
    new Date(),
) {
  const safeNoticeDays =
    normalizeLeaveRequestMinimumNoticeDays(
      minimumNoticeDays,
    );

  return addCalendarDays(
    getCopenhagenLocalDate(
      referenceDate,
    ),
    safeNoticeDays,
  );
}
