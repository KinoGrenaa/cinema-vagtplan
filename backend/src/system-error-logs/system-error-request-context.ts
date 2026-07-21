import { randomUUID } from 'node:crypto';

function getFirstValue(value: unknown) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getNonEmptyString(value: unknown) {
  const normalizedValue = getFirstValue(value);

  if (
    typeof normalizedValue === 'string' &&
    normalizedValue.trim() !== ''
  ) {
    return normalizedValue.trim();
  }

  return null;
}

function getPositiveInteger(value: unknown) {
  const normalizedValue = getFirstValue(value);

  if (
    typeof normalizedValue !== 'string' &&
    typeof normalizedValue !== 'number'
  ) {
    return null;
  }

  if (
    typeof normalizedValue === 'string' &&
    !/^[0-9]+$/.test(normalizedValue)
  ) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function getRequestHeader(request: any, name: string) {
  return request?.headers?.[name] ?? null;
}

function getValidCorrelationId(value: unknown) {
  const correlationId = getNonEmptyString(value);

  if (
    correlationId &&
    /^[A-Za-z0-9._:-]{1,128}$/.test(correlationId)
  ) {
    return correlationId;
  }

  return null;
}

function getExistingCorrelationId(request: any) {
  return (
    getValidCorrelationId(
      getRequestHeader(request, 'x-correlation-id'),
    ) ??
    getValidCorrelationId(
      getRequestHeader(request, 'x-request-id'),
    )
  );
}

function getRequestCinemaId(request: any) {
  const candidates = [
    request?.user?.cinemaId,
    getRequestHeader(request, 'x-cinema-id'),
    getRequestHeader(request, 'x-selected-cinema-id'),
    request?.query?.cinemaId,
    request?.query?.selectedCinemaId,
    request?.body?.cinemaId,
    request?.body?.selectedCinemaId,
    request?.params?.cinemaId,
  ];

  for (const candidate of candidates) {
    const cinemaId = getPositiveInteger(candidate);

    if (cinemaId) {
      return cinemaId;
    }
  }

  return null;
}

export function createSystemErrorRequestContext(
  request: any,
) {
  const correlationId =
    getExistingCorrelationId(request) ?? randomUUID();
  const cinemaId = getRequestCinemaId(request);
  const user =
    request?.user || cinemaId
      ? {
          ...(request?.user ?? {}),
          cinemaId:
            cinemaId ?? request?.user?.cinemaId ?? null,
        }
      : request?.user;

  return {
    correlationId,
    request: {
      ...request,
      headers: {
        ...(request?.headers ?? {}),
        'x-correlation-id': correlationId,
      },
      user,
    },
  };
}
