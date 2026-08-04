import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StaffingRequestType } from '@prisma/client';
import {
  normalizeCreateStaffingRequestInput,
  resolveStaffingCinemaId,
} from './staffing-request-helpers';

describe('staffing request helpers', () => {
  const admin = {
    sub: 11,
    email: 'admin@example.com',
    role: 'ADMIN' as const,
    cinemaId: 7,
  };

  it('normalizes IDs, message and defaults', () => {
    const result = normalizeCreateStaffingRequestInput(
      {
        cinemaId: 7,
        shiftId: 12,
        targetUserId: 13,
        jobFunctionId: 14,
        type: StaffingRequestType.EXTRA_SHIFT,
        message: '  Kan du tage vagten?  ',
      },
      new Date('2026-07-21T10:00:00.000Z'),
    );

    expect(result).toMatchObject({
      cinemaId: 7,
      shiftId: 12,
      targetUserId: 13,
      jobFunctionId: 14,
      type: StaffingRequestType.EXTRA_SHIFT,
      priority: 1,
      message: 'Kan du tage vagten?',
      aiGenerated: false,
    });
  });

  it.each([
    ['cinemaId', 0],
    ['shiftId', -1],
    ['targetUserId', 1.5],
    ['jobFunctionId', Number.NaN],
  ] as const)('rejects invalid %s', (field, value) => {
    expect(() =>
      normalizeCreateStaffingRequestInput({
        type: StaffingRequestType.EXTRA_SHIFT,
        [field]: value,
      }),
    ).toThrow(BadRequestException);
  });

  it.each([0, 6, 1.5])('rejects invalid priority %s', (priority) => {
    expect(() =>
      normalizeCreateStaffingRequestInput({
        type: StaffingRequestType.EXTRA_SHIFT,
        priority,
      }),
    ).toThrow('Prioritet skal være et helt tal fra 1 til 5.');
  });

  it('rejects an empty message', () => {
    expect(() =>
      normalizeCreateStaffingRequestInput({
        type: StaffingRequestType.EXTRA_SHIFT,
        message: '   ',
      }),
    ).toThrow('Beskeden må ikke være tom.');
  });

  it('rejects an expired request', () => {
    expect(() =>
      normalizeCreateStaffingRequestInput(
        {
          type: StaffingRequestType.EMERGENCY,
          expiresAt: '2026-07-21T09:59:59.000Z',
        },
        new Date('2026-07-21T10:00:00.000Z'),
      ),
    ).toThrow('Udløbstidspunktet skal ligge i fremtiden.');
  });

  it('requires MASTER to choose a valid cinema', () => {
    expect(() =>
      resolveStaffingCinemaId(
        {
          sub: 1,
          email: 'master@example.com',
          role: 'MASTER',
          cinemaId: null,
        },
        undefined,
      ),
    ).toThrow('Vælg en biograf');
  });

  it('rejects a different cinema for an administrator', () => {
    expect(() => resolveStaffingCinemaId(admin, 8)).toThrow(
      ForbiddenException,
    );
  });

  it('returns the active session cinema for an administrator', () => {
    expect(resolveStaffingCinemaId(admin, 7)).toBe(7);
  });
});
