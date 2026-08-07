import {
  EmptyShiftPlanningNamedDraftError,
  ShiftPlanningNamedDraftNotEditableError,
  ShiftPlanningNamedDraftNotFoundError,
  copyNamedShiftPlanningDraft,
  createEmptyNamedShiftPlanningDraft,
  openNamedShiftPlanningDraftWorkspace,
  saveNamedShiftPlanningDraft,
  updateNamedShiftPlanningDraft,
} from './shift-planning-named-draft-workspace';

const draftRow = {
  id: 41,
  cinemaId: 1,
  year: 2026,
  month: 8,
  status: 'DRAFT',
  note: 'August',
  createdAt: new Date('2026-08-06T06:00:00.000Z'),
  updatedAt: new Date('2026-08-06T06:00:00.000Z'),
};

const generatedItem = {
  date: new Date('2026-08-10T00:00:00.000Z'),
  monthPlanDayId: 10,
  scheduleTemplateId: 2,
  scheduleTemplateDayId: 20,
  templateJobFunctionId: 30,
  jobFunctionId: 4,
  userId: null,
  requiredIndex: 1,
  plannedStartMinute: 960,
  plannedEndMinute: 1290,
  warningCode: null,
  warningMessage: null,
  metadata: { dateKey: '2026-08-10' },
};

describe('saveNamedShiftPlanningDraft', () => {
  it('gemmer en navngivet kladde uden at erstatte andre kladder', async () => {
    const create = jest.fn().mockResolvedValue(draftRow);
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const transactionClient = {
      shiftPlanningDraft: { create },
      shiftPlanningDraftItem: { createMany },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;
    const buildMonthData = jest.fn().mockResolvedValue({
      warnings: [],
      items: [generatedItem],
    });

    const result = await saveNamedShiftPlanningDraft(
      prisma,
      {
        cinemaId: 1,
        year: 2026,
        month: 8,
        name: 'August',
        actorUserId: 7,
      },
      buildMonthData,
    );

    expect(result.id).toBe(41);
    expect(result.itemCount).toBe(1);
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ draftId: 41, status: 'DRAFT' })],
      }),
    );
  });

  it('afviser at gemme et tomt arbejdsforslag via det gamle gem-endpoint', async () => {
    const prisma = { $transaction: jest.fn() } as any;
    const buildMonthData = jest.fn().mockResolvedValue({ warnings: [], items: [] });

    await expect(
      saveNamedShiftPlanningDraft(
        prisma,
        {
          cinemaId: 1,
          year: 2026,
          month: 8,
          name: 'Tom kladde',
          actorUserId: 7,
        },
        buildMonthData,
      ),
    ).rejects.toBeInstanceOf(EmptyShiftPlanningNamedDraftError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('createEmptyNamedShiftPlanningDraft', () => {
  it('opretter en tom, navngivet og åben kladde', async () => {
    const queryRaw = jest.fn().mockResolvedValue([draftRow]);
    const prisma = { $queryRaw: queryRaw } as any;

    const result = await createEmptyNamedShiftPlanningDraft(prisma, {
      cinemaId: 1,
      year: 2026,
      month: 8,
      name: 'August',
      actorUserId: 7,
    });

    expect(result).toEqual({ ...draftRow, itemCount: 0, warningCount: 0 });
    const sql = queryRaw.mock.calls[0][0] as { strings: string[] };
    expect(sql.strings.join(' ')).toContain("'DRAFT'");
    expect(sql.strings.join(' ')).not.toContain('scheduleTemplateId');
  });
});

describe('openNamedShiftPlanningDraftWorkspace', () => {
  it('indlæser kladdens skabeloner som redigerbart månedsarbejdsområde', async () => {
    const outerQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const transactionQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const executeRaw = jest.fn().mockResolvedValueOnce(31).mockResolvedValueOnce(14);
    const transactionClient = {
      $queryRaw: transactionQueryRaw,
      $executeRaw: executeRaw,
    };
    const prisma = {
      $queryRaw: outerQueryRaw,
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;

    const result = await openNamedShiftPlanningDraftWorkspace(prisma, {
      draftId: 41,
      cinemaId: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        draftId: 41,
        clearedDayCount: 31,
        restoredTemplateDayCount: 14,
      }),
    );
    expect(executeRaw).toHaveBeenCalledTimes(2);
    const restoreSql = executeRaw.mock.calls[1][0] as { strings: string[] };
    expect(restoreSql.strings.join(' ')).toContain('ShiftPlanningDraftItem');
    expect(restoreSql.strings.join(' ')).toContain('scheduleTemplateId');
  });

  it('afviser en historisk kladde som redigerbart arbejdsområde', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ ...draftRow, status: 'SUPERSEDED' }]),
      $transaction: jest.fn(),
    } as any;

    await expect(
      openNamedShiftPlanningDraftWorkspace(prisma, {
        draftId: 41,
        cinemaId: 1,
      }),
    ).rejects.toBeInstanceOf(ShiftPlanningNamedDraftNotEditableError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('updateNamedShiftPlanningDraft', () => {
  it('erstatter kladdens poster med det aktuelle månedsarbejdsområde', async () => {
    const outerQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const transactionQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const executeRaw = jest.fn().mockResolvedValue(1);
    const transactionClient = {
      $queryRaw: transactionQueryRaw,
      $executeRaw: executeRaw,
      shiftPlanningDraftItem: { deleteMany, createMany },
    };
    const prisma = {
      $queryRaw: outerQueryRaw,
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;
    const buildMonthData = jest.fn().mockResolvedValue({
      warnings: [{ code: 'TEST', message: 'Test' }],
      items: [generatedItem],
    });

    const result = await updateNamedShiftPlanningDraft(
      prisma,
      { draftId: 41, cinemaId: 1 },
      buildMonthData,
    );

    expect(result.itemCount).toBe(1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { draftId: 41, cinemaId: 1 },
    });
    expect(createMany).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
  });

  it('tillader at en åben kladde gemmes uden forslag', async () => {
    const outerQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const transactionQueryRaw = jest.fn().mockResolvedValue([draftRow]);
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const createMany = jest.fn();
    const executeRaw = jest.fn().mockResolvedValue(1);
    const transactionClient = {
      $queryRaw: transactionQueryRaw,
      $executeRaw: executeRaw,
      shiftPlanningDraftItem: { deleteMany, createMany },
    };
    const prisma = {
      $queryRaw: outerQueryRaw,
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;
    const buildMonthData = jest.fn().mockResolvedValue({ warnings: [], items: [] });

    const result = await updateNamedShiftPlanningDraft(
      prisma,
      { draftId: 41, cinemaId: 1 },
      buildMonthData,
    );

    expect(result.itemCount).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe('copyNamedShiftPlanningDraft', () => {
  const copiedDraft = { ...draftRow, id: 52, note: 'August – kopi' };

  it('kopierer kladden atomisk med databasens egne snapshotværdier', async () => {
    const queryRaw = jest.fn().mockResolvedValue([copiedDraft]);
    const executeRaw = jest.fn().mockResolvedValue(30);
    const transactionClient = { $queryRaw: queryRaw, $executeRaw: executeRaw };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;

    const result = await copyNamedShiftPlanningDraft(prisma, {
      sourceDraftId: 41,
      cinemaId: 1,
      name: 'August – kopi',
      actorUserId: 7,
    });

    expect(result).toEqual({ ...copiedDraft, itemCount: 30 });
    const draftInsertSql = queryRaw.mock.calls[0][0] as { strings: string[] };
    const itemInsertSql = executeRaw.mock.calls[0][0] as { strings: string[] };
    expect(draftInsertSql.strings.join(' ')).not.toContain(
      'source_draft."scheduleTemplateId"',
    );
    expect(itemInsertSql.strings.join(' ')).toContain(
      'source_item."scheduleTemplateId"',
    );
  });

  it('afviser en kladde fra en anden biograf eller et ukendt id', async () => {
    const transactionClient = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(transactionClient)),
    } as any;

    await expect(
      copyNamedShiftPlanningDraft(prisma, {
        sourceDraftId: 999,
        cinemaId: 1,
        name: 'Kopi',
        actorUserId: 7,
      }),
    ).rejects.toBeInstanceOf(ShiftPlanningNamedDraftNotFoundError);
    expect(transactionClient.$executeRaw).not.toHaveBeenCalled();
  });
});
