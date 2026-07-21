import { BadRequestException } from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';

export const SHIFT_TRADE_MESSAGE_MAX_LENGTH = 1000;

export type ShiftTradeCreateInput = {
  shiftId: number;
  offeredByUserId: number;
  cinemaId: number;
  type?: ShiftTradeType;
  targetUserId?: number;
  message?: string;
};

function getPositiveId(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(
      `${label} skal være et gyldigt ID`,
    );
  }

  return parsed;
}

function normalizeMessage(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Beskeden skal være tekst',
    );
  }

  const message = value.trim();

  if (message.length > SHIFT_TRADE_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(
      `Beskeden må højst være ${SHIFT_TRADE_MESSAGE_MAX_LENGTH} tegn`,
    );
  }

  return message || undefined;
}

export function normalizeShiftTradeCreateInput(
  input: ShiftTradeCreateInput,
) {
  const shiftId = getPositiveId(input.shiftId, 'Vagt');
  const offeredByUserId = getPositiveId(
    input.offeredByUserId,
    'Tilbyder',
  );
  const cinemaId = getPositiveId(
    input.cinemaId,
    'Biograf',
  );
  const type = input.type ?? ShiftTradeType.POOL;

  if (
    type !== ShiftTradeType.POOL &&
    type !== ShiftTradeType.DIRECT
  ) {
    throw new BadRequestException(
      'Vagtbyttetype er ugyldig',
    );
  }

  const targetUserId =
    input.targetUserId === undefined ||
    input.targetUserId === null
      ? undefined
      : getPositiveId(
          input.targetUserId,
          'Modtager',
        );

  if (
    type === ShiftTradeType.DIRECT &&
    !targetUserId
  ) {
    throw new BadRequestException(
      'Direkte vagtbytte kræver en modtager',
    );
  }

  if (
    type === ShiftTradeType.POOL &&
    targetUserId
  ) {
    throw new BadRequestException(
      'Vagtpuljen må ikke have en direkte modtager',
    );
  }

  if (targetUserId === offeredByUserId) {
    throw new BadRequestException(
      'Du kan ikke tilbyde vagten til dig selv',
    );
  }

  return {
    shiftId,
    offeredByUserId,
    cinemaId,
    type,
    targetUserId,
    message: normalizeMessage(input.message),
  };
}
