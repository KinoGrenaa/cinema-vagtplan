import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController boundaries', () => {
  let controller: UsersController;
  let usersService: {
    findAll: jest.Mock;
    findOwnProfile: jest.Mock;
    findOwnCinemaMemberships: jest.Mock;
    findManagedCinemaMemberships: jest.Mock;
    updateManagedCinemaMemberships: jest.Mock;
    createUser: jest.Mock;
    updateUser: jest.Mock;
    deleteUser: jest.Mock;
    reactivateUser: jest.Mock;
    updateOwnProfile: jest.Mock;
    updateTheme: jest.Mock;
  };

  beforeEach(() => {
    usersService = {
      findAll: jest.fn(),
      findOwnProfile: jest.fn(),
      findOwnCinemaMemberships: jest.fn(),
      findManagedCinemaMemberships: jest.fn(),
      updateManagedCinemaMemberships: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      reactivateUser: jest.fn(),
      updateOwnProfile: jest.fn(),
      updateTheme: jest.fn(),
    };

    controller = new UsersController(
      usersService as unknown as UsersService,
    );
  });

  it('passes a strict cinema filter to the service', () => {
    const currentUser = {
      sub: 1,
      email: 'master@example.com',
      role: 'MASTER' as const,
      cinemaId: null,
    };

    controller.getAllUsers(
      {
        user: currentUser,
      },
      '12',
    );

    expect(usersService.findAll).toHaveBeenCalledWith(
      currentUser,
      12,
    );
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema filter %p', (cinemaId) => {
    expect(() =>
      controller.getAllUsers(
        {
          user: {
            sub: 1,
            email: 'master@example.com',
            role: 'MASTER',
            cinemaId: null,
          },
        },
        cinemaId,
      ),
    ).toThrow(BadRequestException);

    expect(usersService.findAll).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '0',
    '-2',
    '2.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid user route ID %p', (id) => {
    expect(() =>
      controller.getUserCinemaMemberships(id),
    ).toThrow(BadRequestException);

    expect(
      usersService.findManagedCinemaMemberships,
    ).not.toHaveBeenCalled();
  });

  it('normalizes membership IDs', () => {
    const currentUser = {
      sub: 1,
      email: 'master@example.com',
      role: 'MASTER' as const,
      cinemaId: null,
    };

    controller.updateUserCinemaMemberships(
      '7',
      {
        cinemaIds: [1, '2' as unknown as number, 3],
      },
      {
        user: currentUser,
      },
    );

    expect(
      usersService.updateManagedCinemaMemberships,
    ).toHaveBeenCalledWith(
      7,
      [1, 2, 3],
      currentUser,
    );
  });

  it.each([
    { cinemaIds: [] },
    { cinemaIds: [1, 1] },
    { cinemaIds: [1, '1e2'] },
    { cinemaIds: [1, 1.5] },
    { cinemaIds: [1, -2] },
    { cinemaIds: [1, Number.MAX_SAFE_INTEGER + 1] },
  ])(
    'rejects invalid membership IDs $cinemaIds',
    ({ cinemaIds }) => {
      expect(() =>
        controller.updateUserCinemaMemberships(
          '7',
          {
            cinemaIds: cinemaIds as number[],
          },
          {
            user: {
              sub: 1,
              email: 'master@example.com',
              role: 'MASTER',
              cinemaId: null,
            },
          },
        ),
      ).toThrow(BadRequestException);

      expect(
        usersService.updateManagedCinemaMemberships,
      ).not.toHaveBeenCalled();
    },
  );

  it('passes a validated user ID to an admin mutation', () => {
    const currentUser = {
      sub: 4,
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      cinemaId: 3,
    };

    controller.deleteUser('27', {
      user: currentUser,
    });

    expect(usersService.deleteUser).toHaveBeenCalledWith(
      27,
      currentUser,
    );
  });

  it('rejects an invalid authenticated user ID', () => {
    expect(() =>
      controller.getOwnProfile({
        user: {
          sub: '1e2',
        },
      }),
    ).toThrow(ForbiddenException);

    expect(usersService.findOwnProfile).not.toHaveBeenCalled();
  });

  it('does not mutate the create-user request body', () => {
    const body = {
      email: 'new@example.com',
      password: 'password123',
      firstName: 'Ny',
      lastName: 'Bruger',
      role: 'EMPLOYEE' as const,
      cinemaId: 99,
    };
    const currentUser = {
      sub: 4,
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      cinemaId: 3,
    };

    controller.createUser(body, {
      user: currentUser,
    });

    expect(body.cinemaId).toBe(99);
    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        cinemaId: 3,
      }),
      currentUser,
    );
  });

  it.each([
    null,
    0,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects invalid admin session cinema %p', (cinemaId) => {
    expect(() =>
      controller.createUser(
        {
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Ny',
          lastName: 'Bruger',
          role: 'EMPLOYEE',
        },
        {
          user: {
            sub: 4,
            email: 'admin@example.com',
            role: 'ADMIN',
            cinemaId,
          },
        },
      ),
    ).toThrow(ForbiddenException);

    expect(usersService.createUser).not.toHaveBeenCalled();
  });

  it('normalizes a valid theme', () => {
    controller.updateTheme(
      '8',
      {
        user: {
          sub: 8,
        },
      },
      {
        theme: '  dark  ',
      },
    );

    expect(usersService.updateTheme).toHaveBeenCalledWith(
      8,
      'dark',
    );
  });

  it.each([
    undefined,
    '',
    '   ',
    12,
    'dark\nmode',
    'x'.repeat(33),
  ])('rejects invalid theme %p', (theme) => {
    expect(() =>
      controller.updateTheme(
        '8',
        {
          user: {
            sub: 8,
          },
        },
        {
          theme,
        },
      ),
    ).toThrow(BadRequestException);

    expect(usersService.updateTheme).not.toHaveBeenCalled();
  });
});
