import { BadRequestException } from '@nestjs/common';
import { StaffingRequestsController } from './staffing-requests.controller';

describe('StaffingRequestsController', () => {
  const service = {
    findAll: jest.fn(),
    findMine: jest.fn(),
    create: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    cancel: jest.fn(),
  };
  const controller =
    new StaffingRequestsController(
      service as never,
    );
  const req = {
    user: {
      sub: 7,
      email: 'employee@example.com',
      role: 'EMPLOYEE' as const,
      cinemaId: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt query-biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.findAll(
          req,
          cinemaId,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.findAll,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+8',
    ' 8',
    '8 ',
    '9007199254740992',
    'ukendt',
    '',
  ])(
    'afviser ugyldigt request-ID %p',
    (id) => {
      expect(() =>
        controller.accept(
          req,
          id,
          '2',
        ),
      ).toThrow(BadRequestException);

      expect(
        service.accept,
      ).not.toHaveBeenCalled();
    },
  );

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+2',
    ' 2',
    '2 ',
    '9007199254740992',
    'ukendt',
  ])(
    'afviser ugyldigt body-biograf-ID %p',
    (cinemaId) => {
      expect(() =>
        controller.create(
          req,
          {
            cinemaId,
          } as never,
        ),
      ).toThrow(BadRequestException);

      expect(
        service.create,
      ).not.toHaveBeenCalled();
    },
  );

  it('bevarer udeladt body-biograf som udeladt', () => {
    controller.create(
      req,
      {
        cinemaId: null,
      } as never,
    );

    expect(
      service.create,
    ).toHaveBeenCalledWith(
      req.user,
      {
        cinemaId: undefined,
      },
    );
  });

  it('videresender validerede IDs', () => {
    controller.accept(
      req,
      '8',
      '2',
    );

    expect(
      service.accept,
    ).toHaveBeenCalledWith(
      req.user,
      8,
      2,
    );
  });

  it('tillader helt udeladt query-biograf', () => {
    controller.findMine(
      req,
      undefined,
    );

    expect(
      service.findMine,
    ).toHaveBeenCalledWith(
      req.user,
      undefined,
    );
  });
});
