import {
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtGuard } from './jwt.guard';

function createContext(
  request: Record<string, any>,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

function membership(
  role: 'ADMIN' | 'EMPLOYEE',
  permissions: Partial<{
    canManageSchedule: boolean;
    canManageUsers: boolean;
    canManagePayroll: boolean;
    canManageLeaveRequests: boolean;
    canManageCinemaSettings: boolean;
    canSendBroadcastMessages: boolean;
  }> = {},
) {
  return {
    role,
    canManageSchedule: false,
    canManageUsers: false,
    canManagePayroll: false,
    canManageLeaveRequests: false,
    canManageCinemaSettings: false,
    canSendBroadcastMessages: false,
    ...permissions,
  };
}

describe('JwtGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    userCinemaMembership: {
      findFirst: jest.fn(),
    },
  };

  let guard: JwtGuard;

  beforeEach(() => {
    jest.clearAllMocks();

    guard = new JwtGuard(
      jwtService as unknown as JwtService,
      prisma as unknown as PrismaService,
    );
  });

  it('uses role and permissions from the active cinema membership', async () => {
    const request: Record<string, any> = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      email: 'old@example.com',
      role: 'EMPLOYEE',
      cinemaId: 4,
      iat: 100,
      exp: 200,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      email: 'current@example.com',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      membership('EMPLOYEE', {
        canManageSchedule: true,
      }),
    );

    await expect(
      guard.canActivate(createContext(request)),
    ).resolves.toBe(true);

    expect(request.user).toEqual({
      sub: 12,
      email: 'current@example.com',
      role: 'EMPLOYEE',
      cinemaId: 4,
      canManageSchedule: true,
      canManageUsers: false,
      canManagePayroll: false,
      canManageLeaveRequests: false,
      canManageCinemaSettings: false,
      canSendBroadcastMessages: false,
      iat: 100,
      exp: 200,
    });
  });

  it('rejects a globally blocked account', async () => {
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      role: 'ADMIN',
      cinemaId: 4,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      email: 'admin@example.com',
      role: 'ADMIN',
      isActive: false,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a token after the cinema role changes', async () => {
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      role: 'ADMIN',
      cinemaId: 4,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      email: 'employee@example.com',
      role: 'EMPLOYEE',
      isActive: true,
    });
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      membership('EMPLOYEE'),
    );

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toThrow(
      'Din rolle i den aktive biograf er ændret.\nLog ind igen',
    );
  });

  it('rejects a removed cinema membership', async () => {
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 12,
      role: 'EMPLOYEE',
      cinemaId: 4,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 12,
      email: 'employee@example.com',
      role: 'EMPLOYEE',
      isActive: true,
    });
    prisma.userCinemaMembership.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toThrow(
      'Din biograftilknytning er ikke længere aktiv.\nLog ind igen',
    );
  });

  it('allows an active MASTER without a cinema membership', async () => {
    const request: Record<string, any> = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'master@example.com',
      role: 'MASTER',
      cinemaId: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'master@example.com',
      role: 'MASTER',
      isActive: true,
    });

    await expect(
      guard.canActivate(createContext(request)),
    ).resolves.toBe(true);

    expect(
      prisma.userCinemaMembership.findFirst,
    ).not.toHaveBeenCalled();
    expect(request.user).toMatchObject({
      role: 'MASTER',
      cinemaId: null,
      canManageUsers: true,
      canManagePayroll: true,
    });
  });
});
