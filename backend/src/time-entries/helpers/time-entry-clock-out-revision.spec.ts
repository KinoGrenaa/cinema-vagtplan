import { recordClockOutTimeEntryAudit } from './time-entry-mutation-records';

describe('clock-out revision history', () => {
  it('records manual clock-out as a time-entry revision with the real actor', async () => {
    const revisionCreate = jest.fn().mockResolvedValue({ id: 1 });
    const auditCreate = jest.fn().mockResolvedValue({ id: 2 });

    const clockIn =
      new Date('2026-08-22T07:00:00.000Z');
    const clockOut =
      new Date('2026-08-22T08:00:00.000Z');

    const existingEntry = {
      id: 44,
      userId: 12,
      cinemaId: 3,
      status: 'PENDING',
      clockIn,
      clockOut: null,
      note: null,
      clockInNote: null,
      clockOutNote: null,
      adminNote: null,
    };

    const entry = {
      ...existingEntry,
      clockOut,
    };

    await recordClockOutTimeEntryAudit({
      prisma: {
        timeEntryRevision: {
          create: revisionCreate,
        },
      } as any,
      auditLogsService: {
        create: auditCreate,
      } as any,
      existingEntry,
      entry,
      changedByUserId: 99,
    });

    expect(revisionCreate).toHaveBeenCalledTimes(1);
    expect(revisionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        timeEntryId: 44,
        changedByUserId: 99,
        action: 'CLOCK_OUT',
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        previousClockIn: clockIn,
        newClockIn: clockIn,
        previousClockOut: null,
        newClockOut: clockOut,
      }),
    });

    expect(auditCreate).toHaveBeenCalledWith({
      action: 'CLOCK_OUT',
      entityType: 'TimeEntry',
      entityId: 44,
      description: 'Medarbejder registrerede fyraften',
      userId: 99,
      cinemaId: 3,
    });
  });
});
