import {
  BadRequestException,
} from '@nestjs/common';
import {
  ensureTimeEntryTargetUserAccess,
  getTimeEntryActorUserId,
  resolveTimeEntryActorCinemaId,
} from './helpers/time-entry-cinema-access';
import {
  findOpenTimeEntry,
} from './helpers/time-entry-read-helpers';
import { TimeEntriesService } from './time-entries.service';

jest.mock(
  './helpers/time-entry-cinema-access',
  () => ({
    ensureTimeEntryTargetUserAccess:
      jest.fn(),
    getTimeEntryActorUserId:
      jest.fn(),
    resolveTimeEntryActorCinemaId:
      jest.fn(),
  }),
);

jest.mock(
  './helpers/time-entry-read-helpers',
  () => ({
    findAllVisibleTimeEntries:
      jest.fn(),
    findOpenTimeEntry:
      jest.fn(),
    findTimeEntriesForUser:
      jest.fn(),
  }),
);

describe('TimeEntriesService boundaries', () => {
  const prisma = {
    timeEntry: {
      findUnique: jest.fn(),
    },
  };
  const realtimeGateway = {};
  const auditLogsService = {};
  const payrollService = {};
  const service = new TimeEntriesService(
    prisma as never,
    realtimeGateway as never,
    auditLogsService as never,
    payrollService as never,
  );

  const admin = {
    sub: 7,
    role: 'ADMIN',
    cinemaId: 2,
  };

  const employee = {
    sub: 7,
    role: 'EMPLOYEE',
    cinemaId: 2,
  };

  const master = {
    sub: 7,
    role: 'MASTER',
    cinemaId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (
      getTimeEntryActorUserId as jest.Mock
    ).mockReturnValue(7);
    (
      resolveTimeEntryActorCinemaId as jest.Mock
    ).mockResolvedValue(2);
    (
      ensureTimeEntryTargetUserAccess as jest.Mock
    ).mockResolvedValue(undefined);
    (
      findOpenTimeEntry as jest.Mock
    ).mockResolvedValue({
      id: 10,
    });
  });

  it('kan oprettes med eksplicitte afhængigheder', () => {
    expect(service).toBeDefined();
  });

  it.each([
    '0',
    '-1',
    '1.5',
    '1e2',
    '+9',
    ' 9',
    '9 ',
    '9007199254740992',
    Number.MAX_SAFE_INTEGER + 1,
  ])(
    'afviser ugyldigt internt bruger-ID %p',
    async (requestedUserId) => {
      await expect(
        service.findOpenEntry(
          admin,
          requestedUserId as never,
          2,
        ),
      ).rejects.toThrow(
        BadRequestException,
      );

      expect(
        resolveTimeEntryActorCinemaId,
      ).not.toHaveBeenCalled();
      expect(
        findOpenTimeEntry,
      ).not.toHaveBeenCalled();
    },
  );

  it('accepterer et strikt bruger-ID for administratorer', async () => {
    await expect(
      service.findOpenEntry(
        admin,
        '9' as never,
        2,
      ),
    ).resolves.toEqual({
      id: 10,
    });

    expect(
      ensureTimeEntryTargetUserAccess,
    ).toHaveBeenCalledWith(
      prisma,
      9,
      2,
    );
    expect(
      findOpenTimeEntry,
    ).toHaveBeenCalledWith(
      prisma,
      {
        userId: 9,
        cinemaId: 2,
      },
    );
  });

  it('lader ikke medarbejdere vælge en anden bruger', async () => {
    await service.findOpenEntry(
      employee,
      9,
      2,
    );

    expect(
      ensureTimeEntryTargetUserAccess,
    ).toHaveBeenCalledWith(
      prisma,
      7,
      2,
    );
    expect(
      findOpenTimeEntry,
    ).toHaveBeenCalledWith(
      prisma,
      {
        userId: 7,
        cinemaId: 2,
      },
    );
  });

  it('bruger MASTER-aktøren uden unødvendigt målbrugeropslag', async () => {
    await service.findOpenEntry(
      master,
      undefined,
      2,
    );

    expect(
      ensureTimeEntryTargetUserAccess,
    ).not.toHaveBeenCalled();
    expect(
      findOpenTimeEntry,
    ).toHaveBeenCalledWith(
      prisma,
      {
        userId: 7,
        cinemaId: 2,
      },
    );
  });
});
