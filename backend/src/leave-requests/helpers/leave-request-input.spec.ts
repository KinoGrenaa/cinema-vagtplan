import { BadRequestException } from '@nestjs/common';
import { LEAVE_REQUEST_REASON_MAX_LENGTH } from '../dto/create-leave-request.dto';
import {
  normalizeLeaveRequestCreateInput,
} from './leave-request-input';

describe('normalizeLeaveRequestCreateInput', () => {
  const futureStart =
    '2099-08-10T08:00:00.000Z';
  const futureEnd =
    '2099-08-10T12:00:00.000Z';

  it('normaliserer begrundelse og ID’er', () => {
    expect(
      normalizeLeaveRequestCreateInput({
        startDate: futureStart,
        endDate: futureEnd,
        reason: '  Ferie  ',
        cinemaId: 2,
        userId: 7,
      }),
    ).toEqual({
      startDate: new Date(futureStart),
      endDate: new Date(futureEnd),
      reason: 'Ferie',
      cinemaId: 2,
      userId: 7,
    });
  });

  it('gør tom begrundelse valgfri', () => {
    expect(
      normalizeLeaveRequestCreateInput({
        startDate: futureStart,
        endDate: futureEnd,
        reason: '   ',
      }).reason,
    ).toBeUndefined();
  });

  it('afviser for lang begrundelse', () => {
    expect(() =>
      normalizeLeaveRequestCreateInput({
        startDate: futureStart,
        endDate: futureEnd,
        reason: 'x'.repeat(
          LEAVE_REQUEST_REASON_MAX_LENGTH + 1,
        ),
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    ['cinemaId', 0],
    ['userId', -1],
    ['userId', 1.5],
  ])(
    'afviser ugyldigt %s',
    (field, value) => {
      expect(() =>
        normalizeLeaveRequestCreateInput({
          startDate: futureStart,
          endDate: futureEnd,
          [field]: value,
        }),
      ).toThrow(BadRequestException);
    },
  );

  it('afviser ugyldige datoer', () => {
    expect(() =>
      normalizeLeaveRequestCreateInput({
        startDate: 'ikke-en-dato',
        endDate: futureEnd,
      }),
    ).toThrow(BadRequestException);
  });
});
