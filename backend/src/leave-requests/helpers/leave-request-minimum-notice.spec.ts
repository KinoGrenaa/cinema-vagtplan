import { BadRequestException } from '@nestjs/common';

import {
  validateLeaveRequestMinimumNotice,
} from './leave-request-service-helpers';

describe('leave request minimum notice', () => {
  const referenceDate =
    new Date('2026-08-20T08:14:00.000Z');

  it('tillader dags dato ved 0 kalenderdages varsel', () => {
    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-19T22:00:00.000Z'),
        0,
        referenceDate,
      ),
    ).not.toThrow();
  });

  it('afviser fortid selv ved 0 kalenderdages varsel', () => {
    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-19T21:59:59.999Z'),
        0,
        referenceDate,
      ),
    ).toThrow(
      new BadRequestException(
        'Fravær kan ikke søges tilbage i tiden.',
      ),
    );
  });

  it('kræver i morgen ved 1 kalenderdags varsel', () => {
    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-20T22:00:00.000Z'),
        1,
        referenceDate,
      ),
    ).not.toThrow();

    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-20T21:59:59.999Z'),
        1,
        referenceDate,
      ),
    ).toThrow(
      new BadRequestException(
        'Fravær skal søges mindst 1 kalenderdag før start.',
      ),
    );
  });

  it('kræver overmorgen ved 2 kalenderdages varsel', () => {
    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-21T22:00:00.000Z'),
        2,
        referenceDate,
      ),
    ).not.toThrow();

    expect(() =>
      validateLeaveRequestMinimumNotice(
        new Date('2026-08-20T22:00:00.000Z'),
        2,
        referenceDate,
      ),
    ).toThrow(
      new BadRequestException(
        'Fravær skal søges mindst 2 kalenderdage før start.',
      ),
    );
  });
});
