import { BadRequestException } from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';
import {
  normalizeShiftTradeCreateInput,
  SHIFT_TRADE_MESSAGE_MAX_LENGTH,
} from './shift-trade-input';

describe('normalizeShiftTradeCreateInput', () => {
  it('normaliserer et direkte vagtbytte', () => {
    expect(
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        type: ShiftTradeType.DIRECT,
        targetUserId: 8,
        message: '  Kan du tage vagten?  ',
      }),
    ).toEqual({
      shiftId: 10,
      offeredByUserId: 4,
      cinemaId: 2,
      type: ShiftTradeType.DIRECT,
      targetUserId: 8,
      message: 'Kan du tage vagten?',
    });
  });

  it('bruger vagtpuljen som standard', () => {
    expect(
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        message: '   ',
      }),
    ).toEqual({
      shiftId: 10,
      offeredByUserId: 4,
      cinemaId: 2,
      type: ShiftTradeType.POOL,
      targetUserId: undefined,
      message: undefined,
    });
  });

  it('kræver modtager ved direkte vagtbytte', () => {
    expect(() =>
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        type: ShiftTradeType.DIRECT,
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser modtager på vagtpuljen', () => {
    expect(() =>
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        type: ShiftTradeType.POOL,
        targetUserId: 8,
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser selvtilbud', () => {
    expect(() =>
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        type: ShiftTradeType.DIRECT,
        targetUserId: 4,
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser for lang besked', () => {
    expect(() =>
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        message: 'x'.repeat(
          SHIFT_TRADE_MESSAGE_MAX_LENGTH + 1,
        ),
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['shiftId', 0],
    ['offeredByUserId', -1],
    ['cinemaId', 1.5],
  ])('afviser ugyldigt %s', (field, value) => {
    expect(() =>
      normalizeShiftTradeCreateInput({
        shiftId: 10,
        offeredByUserId: 4,
        cinemaId: 2,
        [field]: value,
      }),
    ).toThrow(BadRequestException);
  });
});
