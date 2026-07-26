function requirePositiveId(
  value: number,
  label: string,
) {
  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new RangeError(
      `${label} skal være et positivt heltal`,
    );
  }

  return value;
}

export function getShiftTradeNotificationLink(
  tradeId: number,
) {
  return (
    '/shift-trades?tradeId=' +
    requirePositiveId(
      tradeId,
      'Vagtbytte-ID',
    )
  );
}

export function getStaffingRequestNotificationLink(
  requestId: number,
) {
  return (
    '/staffing-requests?requestId=' +
    requirePositiveId(
      requestId,
      'Forespørgsels-ID',
    )
  );
}
