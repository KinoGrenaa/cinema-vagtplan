import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type {
  ExecutionContext,
} from '@nestjs/common';
import { CinemaModuleAccessGuard } from './cinema-module-access.guard';

function createContext(
  request: Record<string, any>,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function createGuard() {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const prisma = {};
  const cinemaModulesService = {
    isEnabled: jest
      .fn()
      .mockResolvedValue(true),
  };
  const guard =
    new CinemaModuleAccessGuard(
      jwtService as never,
      prisma as never,
      cinemaModulesService as never,
    );

  return {
    guard,
    jwtService,
    cinemaModulesService,
  };
}

describe('CinemaModuleAccessGuard', () => {
  it('ignores routes without a module mapping', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          path: '/cinemas',
          headers: {},
        }),
      ),
    ).resolves.toBe(true);

    expect(
      cinemaModulesService.isEnabled,
    ).not.toHaveBeenCalled();
  });

  it('uses the active session cinema for members', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          path: '/payroll',
          headers: {},
          query: {},
          user: {
            sub: 7,
            email:
              'admin@example.com',
            role: 'ADMIN',
            cinemaId: 2,
          },
        }),
      ),
    ).resolves.toBe(true);

    expect(
      cinemaModulesService.isEnabled,
    ).toHaveBeenCalledWith(
      2,
      'PAYROLL',
    );
  });

  it('uses the selected cinema header for MASTER', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          path:
            '/messages/unread-count',
          headers: {
            'x-cinema-id': '3',
          },
          query: {},
          user: {
            sub: 1,
            email:
              'master@example.com',
            role: 'MASTER',
            cinemaId: null,
          },
        }),
      ),
    ).resolves.toBe(true);

    expect(
      cinemaModulesService.isEnabled,
    ).toHaveBeenCalledWith(
      3,
      'MESSAGES',
    );
  });

  it('falls back to query cinema for MASTER', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          path: '/leave-requests',
          headers: {},
          query: {
            cinemaId: '4',
          },
          user: {
            sub: 1,
            email:
              'master@example.com',
            role: 'MASTER',
            cinemaId: null,
          },
        }),
      ),
    ).resolves.toBe(true);

    expect(
      cinemaModulesService.isEnabled,
    ).toHaveBeenCalledWith(
      4,
      'LEAVE',
    );
  });


  it('uses originalUrl when Express exposes a controller-local path', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    cinemaModulesService.isEnabled.mockResolvedValue(
      false,
    );

    await expect(
      guard.canActivate(
        createContext({
          path: '/user/7',
          baseUrl:
            '/employee-documents',
          originalUrl:
            '/employee-documents/user/7?cinemaId=2',
          headers: {},
          query: {
            cinemaId: '2',
          },
          user: {
            sub: 7,
            email:
              'admin@example.com',
            role: 'ADMIN',
            cinemaId: 2,
          },
        }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code:
          'CINEMA_MODULE_DISABLED',
        moduleKey:
          'EMPLOYEE_DOCUMENTS',
        cinemaId: 2,
      }),
    });

    expect(
      cinemaModulesService.isEnabled,
    ).toHaveBeenCalledWith(
      2,
      'EMPLOYEE_DOCUMENTS',
    );
  });

  it('requires an active cinema for MASTER module routes', async () => {
    const {
      guard,
    } = createGuard();

    await expect(
      guard.canActivate(
        createContext({
          path: '/shifts',
          headers: {},
          query: {},
          user: {
            sub: 1,
            email:
              'master@example.com',
            role: 'MASTER',
            cinemaId: null,
          },
        }),
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects disabled modules with a stable error code', async () => {
    const {
      guard,
      cinemaModulesService,
    } = createGuard();

    cinemaModulesService.isEnabled.mockResolvedValue(
      false,
    );

    await expect(
      guard.canActivate(
        createContext({
          path: '/employee-documents/user/7',
          headers: {},
          query: {},
          user: {
            sub: 7,
            email:
              'admin@example.com',
            role: 'ADMIN',
            cinemaId: 2,
          },
        }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code:
          'CINEMA_MODULE_DISABLED',
        moduleKey:
          'EMPLOYEE_DOCUMENTS',
        cinemaId: 2,
      }),
    });

    await expect(
      guard.canActivate(
        createContext({
          path: '/employee-documents/user/7',
          headers: {},
          query: {},
          user: {
            sub: 7,
            email:
              'admin@example.com',
            role: 'ADMIN',
            cinemaId: 2,
          },
        }),
      ),
    ).rejects.toThrow(
      ForbiddenException,
    );
  });
});
