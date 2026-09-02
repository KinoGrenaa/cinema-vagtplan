import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  findDashboardHorizonPreference,
  normalizeDashboardHorizonDays,
} from './user-dashboard-preference';

describe('user dashboard preference', () => {
  it.each([1, 10, 30])(
    'accepterer dashboardperiode %p',
    (days) => {
      expect(
        normalizeDashboardHorizonDays(days),
      ).toBe(days);
    },
  );

  it.each([
    0,
    31,
    1.5,
    -1,
    '10',
    null,
    undefined,
  ])(
    'afviser ugyldig dashboardperiode %p',
    (value) => {
      expect(() =>
        normalizeDashboardHorizonDays(value),
      ).toThrow(BadRequestException);
    },
  );

  it('læser den gemte dashboardperiode', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            dashboardHorizonDays: 14,
          }),
      },
    };

    await expect(
      findDashboardHorizonPreference(
        prisma as never,
        7,
      ),
    ).resolves.toEqual({
      dashboardHorizonDays: 14,
    });

    expect(
      prisma.user.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 7,
      },
      select: {
        dashboardHorizonDays: true,
      },
    });
  });

  it('afviser en slettet bruger', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue(null),
      },
    };

    await expect(
      findDashboardHorizonPreference(
        prisma as never,
        7,
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
