import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createEmployeeDocument } from '../employee-documents/helpers/employee-document-create-flow';
import {
  ensureLeaveActorCinemaAccess,
  getActiveLeaveCinemaUserWhere,
} from '../leave-requests/helpers/leave-request-cinema-access';
import {
  getActiveMessageReceiverWhere,
  resolveMessageActorContext,
} from '../messages/helpers/message-cinema-access';
import { resolveMovieShowingsCinemaId } from '../movie-showings/helpers/movie-showing-cinema-access';

describe('membership-only cinema access', () => {
  it('requires an active membership when uploading an employee document', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
          }),
      },
      employeeDocument: {
        create: jest
          .fn()
          .mockResolvedValue({
            id: 1,
          }),
      },
    };

    await createEmployeeDocument(
      prisma as never,
      {
        sub: 2,
        role: 'ADMIN',
        cinemaId: 7,
      },
      {
        userId: 9,
        title: 'Kontrakt',
        fileUrl: '/document.pdf',
        fileName: 'document.pdf',
      },
    );

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 9,
        isActive: true,
        cinemaMemberships: {
          some: {
            cinemaId: 7,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('builds leave access without a legacy cinemaId fallback', async () => {
    expect(
      getActiveLeaveCinemaUserWhere(9, 7),
    ).toEqual({
      id: 9,
      isActive: true,
      cinemaMemberships: {
        some: {
          cinemaId: 7,
          isActive: true,
        },
      },
    });

    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
    };

    await expect(
      ensureLeaveActorCinemaAccess(
        prisma as never,
        {
          sub: 9,
          email: 'anna@example.com',
          role: 'EMPLOYEE',
          cinemaId: 7,
        },
        7,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('uses the active membership role and permission for messages', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            cinemaMemberships: [
              {
                role: 'EMPLOYEE',
                canSendBroadcastMessages: true,
              },
            ],
          }),
      },
    };

    await expect(
      resolveMessageActorContext(
        prisma as never,
        {
          sub: 9,
          role: 'EMPLOYEE',
          cinemaId: 7,
        },
      ),
    ).resolves.toEqual({
      userId: 9,
      cinemaId: 7,
      role: 'EMPLOYEE',
      canSendBroadcastMessages: true,
    });

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 7,
              isActive: true,
            },
          },
        },
      }),
    );

    expect(
      getActiveMessageReceiverWhere(12, 7),
    ).toEqual({
      id: 12,
      isActive: true,
      cinemaMemberships: {
        some: {
          cinemaId: 7,
          isActive: true,
        },
      },
    });
  });

  it('rejects a stale message role', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            cinemaMemberships: [
              {
                role: 'ADMIN',
                canSendBroadcastMessages: true,
              },
            ],
          }),
      },
    };

    await expect(
      resolveMessageActorContext(
        prisma as never,
        {
          sub: 9,
          role: 'EMPLOYEE',
          cinemaId: 7,
        },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('validates movie-showing access against the active membership role', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 9,
            cinemaMemberships: [
              {
                role: 'ADMIN',
              },
            ],
          }),
      },
    };

    await expect(
      resolveMovieShowingsCinemaId(
        prisma as never,
        {
          sub: 9,
          role: 'ADMIN',
          cinemaId: 7,
        },
      ),
    ).resolves.toBe(7);

    expect(
      prisma.user.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 9,
          isActive: true,
          cinemaMemberships: {
            some: {
              cinemaId: 7,
              isActive: true,
            },
          },
        },
      }),
    );
  });

  it('does not allow a missing employee-document membership to fall back to User.cinemaId', async () => {
    const prisma = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue(null),
      },
      employeeDocument: {
        create: jest.fn(),
      },
    };

    await expect(
      createEmployeeDocument(
        prisma as never,
        {
          sub: 2,
          role: 'ADMIN',
          cinemaId: 7,
        },
        {
          userId: 9,
          title: 'Kontrakt',
          fileUrl: '/document.pdf',
          fileName: 'document.pdf',
        },
      ),
    ).rejects.toThrow(NotFoundException);

    expect(
      prisma.employeeDocument.create,
    ).not.toHaveBeenCalled();
  });
});
