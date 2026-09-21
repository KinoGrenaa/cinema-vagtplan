import { isExactDraftExistingShiftMatch } from './shift-planning-drafts.service';

describe('shift planning draft existing shift overlap validation', () => {
  const interval = {
    userId: 3,
    jobFunctionId: 1,
    start: new Date('2026-09-22T14:00:00.000Z'),
    end: new Date('2026-09-22T19:35:00.000Z'),
  };

  it('ignorerer den præcis samme faktiske vagt', () => {
    expect(
      isExactDraftExistingShiftMatch(interval, {
        userId: 3,
        jobFunctionId: 1,
        startTime: new Date('2026-09-22T14:00:00.000Z'),
        endTime: new Date('2026-09-22T19:35:00.000Z'),
      }),
    ).toBe(true);
  });

  it('ignorerer ikke samme tidspunkt med en anden jobfunktion', () => {
    expect(
      isExactDraftExistingShiftMatch(interval, {
        userId: 3,
        jobFunctionId: 2,
        startTime: new Date('2026-09-22T14:00:00.000Z'),
        endTime: new Date('2026-09-22T19:35:00.000Z'),
      }),
    ).toBe(false);
  });

  it('ignorerer ikke en reel overlapning for samme medarbejder', () => {
    expect(
      isExactDraftExistingShiftMatch(interval, {
        userId: 3,
        jobFunctionId: 1,
        startTime: new Date('2026-09-22T13:30:00.000Z'),
        endTime: new Date('2026-09-22T18:00:00.000Z'),
      }),
    ).toBe(false);
  });

  it('ignorerer ikke den samme vagt for en anden medarbejder', () => {
    expect(
      isExactDraftExistingShiftMatch(interval, {
        userId: 5,
        jobFunctionId: 1,
        startTime: new Date('2026-09-22T14:00:00.000Z'),
        endTime: new Date('2026-09-22T19:35:00.000Z'),
      }),
    ).toBe(false);
  });
});
