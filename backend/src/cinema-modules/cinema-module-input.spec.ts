import { BadRequestException } from '@nestjs/common';
import { normalizeCinemaModuleUpdateBody } from './cinema-module-input';

describe('cinema module input', () => {
  it('normalizes valid module updates', () => {
    expect(
      normalizeCinemaModuleUpdateBody({
        modules: [
          {
            key: 'PAYROLL',
            enabled: false,
          },
          {
            key: 'MESSAGES',
            enabled: true,
          },
        ],
      }),
    ).toEqual({
      modules: [
        {
          key: 'PAYROLL',
          enabled: false,
        },
        {
          key: 'MESSAGES',
          enabled: true,
        },
      ],
    });
  });

  it.each([
    undefined,
    null,
    {},
    {
      modules: [],
    },
    {
      modules: [
        {
          key: 'UNKNOWN',
          enabled: true,
        },
      ],
    },
    {
      modules: [
        {
          key: 'PAYROLL',
          enabled: 'true',
        },
      ],
    },
    {
      modules: [
        {
          key: 'PAYROLL',
          enabled: true,
          price: 100,
        },
      ],
    },
    {
      modules: [
        {
          key: 'PAYROLL',
          enabled: true,
        },
        {
          key: 'PAYROLL',
          enabled: false,
        },
      ],
    },
  ])(
    'rejects invalid module body %p',
    (body) => {
      expect(() =>
        normalizeCinemaModuleUpdateBody(
          body,
        ),
      ).toThrow(BadRequestException);
    },
  );
});
