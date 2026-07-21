import { BadRequestException } from '@nestjs/common';
import {
  normalizeShiftWriteData,
  SHIFT_NOTE_MAX_LENGTH,
} from './shift-input';

describe('normalizeShiftWriteData', () => {
  const startTime =
    '2026-08-10T08:00:00.000Z';
  const endTime =
    '2026-08-10T12:00:00.000Z';

  it('normaliserer vagtinput', () => {
    expect(
      normalizeShiftWriteData({
        startTime,
        endTime,
        workTypeId: 3,
        cinemaId: 2,
        userId: 7,
        note: '  Kasse  ',
      }),
    ).toEqual({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      workTypeId: 3,
      cinemaId: 2,
      userId: 7,
      note: 'Kasse',
    });
  });

  it('tillader en ikke-tildelt vagt', () => {
    expect(
      normalizeShiftWriteData({
        startTime,
        endTime,
        workTypeId: 3,
        userId: null,
        note: '   ',
      }),
    ).toMatchObject({
      userId: null,
      note: null,
    });
  });

  it('afviser sluttid før starttid', () => {
    expect(() =>
      normalizeShiftWriteData({
        startTime: endTime,
        endTime: startTime,
        workTypeId: 3,
      }),
    ).toThrow(BadRequestException);
  });

  it('afviser for lang note', () => {
    expect(() =>
      normalizeShiftWriteData({
        startTime,
        endTime,
        workTypeId: 3,
        note: 'x'.repeat(
          SHIFT_NOTE_MAX_LENGTH + 1,
        ),
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['workTypeId', 0],
    ['cinemaId', -1],
    ['userId', 1.5],
  ])(
    'afviser ugyldigt %s',
    (field, value) => {
      expect(() =>
        normalizeShiftWriteData({
          startTime,
          endTime,
          workTypeId: 3,
          [field]: value,
        }),
      ).toThrow(BadRequestException);
    },
  );
});
