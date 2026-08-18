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
  createdAt:
    new Date(
      '2026-08-06T06:00:00.000Z',
    ),
  updatedAt:
    new Date(
      '2026-08-06T06:00:00.000Z',
    ),
};

const generatedItem = {
  date:
    new Date(
      '2026-08-10T00:00:00.000Z',
    ),
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
  metadata: {
    dateKey: '2026-08-10',
  },
};

const workspaceDay = {
  date:
    new Date(
      '2026-08-27T00:00:00.000Z',
    ),
  isActive: true,
  scheduleTemplateId: 2,
  note: 'Testnote 27/8',
};

function snapshotMocks() {
  return {
    monthPlanDay: {
      findMany:
        jest.fn().mockResolvedValue([
          workspaceDay,
        ]),
      upsert:
        jest.fn().mockResolvedValue(
          undefined,
        ),
    },
    shiftPlanningDraftDay: {
      findMany:
        jest.fn().mockResolvedValue([
          workspaceDay,
        ]),
      deleteMany:
        jest.fn().mockResolvedValue({
          count: 31,
        }),
      createMany:
        jest.fn().mockResolvedValue({
          count: 31,
        }),
    },
  };
}

describe(
  'saveNamedShiftPlanningDraft',
  () => {
    it(
      'gemmer vagtposter og dagsnapshot atomisk',
      async () => {
        const create =
          jest.fn().mockResolvedValue(
            draftRow,
          );

        const createMany =
          jest.fn().mockResolvedValue({
            count: 1,
          });

        const snapshots =
          snapshotMocks();

        const transactionClient = {
          shiftPlanningDraft: {
            create,
          },
          shiftPlanningDraftItem: {
            createMany,
          },
          ...snapshots,
        };

        const prisma = {
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const buildMonthData =
          jest.fn().mockResolvedValue({
            warnings: [],
            items: [
              generatedItem,
            ],
          });

        const result =
          await saveNamedShiftPlanningDraft(
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
        expect(result.itemCount)
          .toBe(1);

        expect(createMany)
          .toHaveBeenCalledTimes(1);

        expect(
          snapshots.monthPlanDay
            .findMany,
        ).toHaveBeenCalledTimes(1);

        expect(
          snapshots
            .shiftPlanningDraftDay
            .deleteMany,
        ).toHaveBeenCalledWith({
          where: {
            draftId: 41,
            cinemaId: 1,
          },
        });

        expect(
          snapshots
            .shiftPlanningDraftDay
            .createMany,
        ).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'afviser det gamle gem-endpoint ved tomt arbejdsforslag',
      async () => {
        const prisma = {
          $transaction:
            jest.fn(),
        } as any;

        const buildMonthData =
          jest.fn().mockResolvedValue({
            warnings: [],
            items: [],
          });

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
        ).rejects.toBeInstanceOf(
          EmptyShiftPlanningNamedDraftError,
        );

        expect(
          prisma.$transaction,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'createEmptyNamedShiftPlanningDraft',
  () => {
    it(
      'opretter en tom kladde med blankt dagsnapshot',
      async () => {
        const queryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const snapshotCreateMany =
          jest.fn().mockResolvedValue({
            count: 31,
          });

        const transactionClient = {
          $queryRaw:
            queryRaw,
          shiftPlanningDraftDay: {
            createMany:
              snapshotCreateMany,
          },
        };

        const prisma = {
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const result =
          await createEmptyNamedShiftPlanningDraft(
            prisma,
            {
              cinemaId: 1,
              year: 2026,
              month: 8,
              name: 'August',
              actorUserId: 7,
            },
          );

        expect(result).toEqual({
          ...draftRow,
          itemCount: 0,
          warningCount: 0,
        });

        expect(
          snapshotCreateMany,
        ).toHaveBeenCalledTimes(1);

        const data =
          snapshotCreateMany
            .mock.calls[0][0]
            .data;

        expect(data)
          .toHaveLength(31);

        expect(data[0])
          .toEqual(
            expect.objectContaining({
              draftId: 41,
              cinemaId: 1,
              isActive: true,
              scheduleTemplateId:
                null,
              note: null,
            }),
          );
      },
    );
  },
);

describe(
  'openNamedShiftPlanningDraftWorkspace',
  () => {
    it(
      'gendanner aktiv-status, skabelon og note',
      async () => {
        const outerQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const transactionQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const snapshotFindMany =
          jest.fn().mockResolvedValue([
            {
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                null,
              note:
                'Gemt note',
            },
          ]);

        const upsert =
          jest.fn().mockResolvedValue(
            undefined,
          );

        const transactionClient = {
          $queryRaw:
            transactionQueryRaw,
          shiftPlanningDraftDay: {
            findMany:
              snapshotFindMany,
          },
          monthPlanDay: {
            upsert,
          },
        };

        const prisma = {
          $queryRaw:
            outerQueryRaw,
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const result =
          await openNamedShiftPlanningDraftWorkspace(
            prisma,
            {
              draftId: 41,
              cinemaId: 1,
            },
          );

        expect(result)
          .toEqual(
            expect.objectContaining({
              draftId: 41,
              restoredDayCount: 1,
            }),
          );

        expect(upsert)
          .toHaveBeenCalledWith({
            where: {
              cinemaId_date: {
                cinemaId: 1,
                date:
                  new Date(
                    '2026-08-27T00:00:00.000Z',
                  ),
              },
            },
            update: {
              isActive: false,
              scheduleTemplateId:
                null,
              note:
                'Gemt note',
            },
            create: {
              cinemaId: 1,
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                null,
              note:
                'Gemt note',
            },
          });
      },
    );

    it(
      'afviser en historisk kladde',
      async () => {
        const prisma = {
          $queryRaw:
            jest.fn().mockResolvedValue([
              {
                ...draftRow,
                status:
                  'SUPERSEDED',
              },
            ]),
          $transaction:
            jest.fn(),
        } as any;

        await expect(
          openNamedShiftPlanningDraftWorkspace(
            prisma,
            {
              draftId: 41,
              cinemaId: 1,
            },
          ),
        ).rejects.toBeInstanceOf(
          ShiftPlanningNamedDraftNotEditableError,
        );

        expect(
          prisma.$transaction,
        ).not.toHaveBeenCalled();
      },
    );
  },
);

describe(
  'updateNamedShiftPlanningDraft',
  () => {
    it(
      'gemmer arbejdsforslag og komplet dagsnapshot',
      async () => {
        const outerQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const transactionQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const deleteMany =
          jest.fn().mockResolvedValue({
            count: 1,
          });

        const createMany =
          jest.fn().mockResolvedValue({
            count: 1,
          });

        const executeRaw =
          jest.fn().mockResolvedValue(
            1,
          );

        const snapshots =
          snapshotMocks();

        const transactionClient = {
          $queryRaw:
            transactionQueryRaw,
          $executeRaw:
            executeRaw,
          shiftPlanningDraftItem: {
            deleteMany,
            createMany,
          },
          ...snapshots,
        };

        const prisma = {
          $queryRaw:
            outerQueryRaw,
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const buildMonthData =
          jest.fn().mockResolvedValue({
            warnings: [
              {
                code: 'TEST',
                message: 'Test',
              },
            ],
            items: [
              generatedItem,
            ],
          });

        const result =
          await updateNamedShiftPlanningDraft(
            prisma,
            {
              draftId: 41,
              cinemaId: 1,
            },
            buildMonthData,
          );

        expect(result.itemCount)
          .toBe(1);

        expect(deleteMany)
          .toHaveBeenCalledWith({
            where: {
              draftId: 41,
              cinemaId: 1,
            },
          });

        expect(createMany)
          .toHaveBeenCalledTimes(1);

        expect(
          snapshots
            .shiftPlanningDraftDay
            .deleteMany,
        ).toHaveBeenCalledTimes(1);

        expect(
          snapshots
            .shiftPlanningDraftDay
            .createMany,
        ).toHaveBeenCalledTimes(1);

        expect(executeRaw)
          .toHaveBeenCalledTimes(1);
      },
    );

    it(
      'tillader at en ?ben kladde gemmes uden forslag',
      async () => {
        const outerQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const transactionQueryRaw =
          jest.fn().mockResolvedValue([
            draftRow,
          ]);

        const snapshots =
          snapshotMocks();

        const transactionClient = {
          $queryRaw:
            transactionQueryRaw,
          $executeRaw:
            jest.fn()
              .mockResolvedValue(1),
          shiftPlanningDraftItem: {
            deleteMany:
              jest.fn()
                .mockResolvedValue({
                  count: 2,
                }),
            createMany:
              jest.fn(),
          },
          ...snapshots,
        };

        const prisma = {
          $queryRaw:
            outerQueryRaw,
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const buildMonthData =
          jest.fn().mockResolvedValue({
            warnings: [],
            items: [],
          });

        const result =
          await updateNamedShiftPlanningDraft(
            prisma,
            {
              draftId: 41,
              cinemaId: 1,
            },
            buildMonthData,
          );

        expect(result.itemCount)
          .toBe(0);

        expect(
          transactionClient
            .shiftPlanningDraftItem
            .createMany,
        ).not.toHaveBeenCalled();

        expect(
          snapshots
            .shiftPlanningDraftDay
            .createMany,
        ).toHaveBeenCalledTimes(1);
      },
    );
  },
);

describe(
  'copyNamedShiftPlanningDraft',
  () => {
    const copiedDraft = {
      ...draftRow,
      id: 52,
      note:
        'August - kopi',
    };

    it(
      'kopierer vagtposter og dagsnapshot atomisk',
      async () => {
        const queryRaw =
          jest.fn().mockResolvedValue([
            copiedDraft,
          ]);

        const executeRaw =
          jest.fn().mockResolvedValue(
            30,
          );

        const snapshotFindMany =
          jest.fn().mockResolvedValue([
            {
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                7,
              note:
                'Kopieret note',
            },
          ]);

        const snapshotCreateMany =
          jest.fn().mockResolvedValue({
            count: 1,
          });

        const transactionClient = {
          $queryRaw:
            queryRaw,
          $executeRaw:
            executeRaw,
          shiftPlanningDraftDay: {
            findMany:
              snapshotFindMany,
            createMany:
              snapshotCreateMany,
          },
        };

        const prisma = {
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const result =
          await copyNamedShiftPlanningDraft(
            prisma,
            {
              sourceDraftId: 41,
              cinemaId: 1,
              name:
                'August - kopi',
              actorUserId: 7,
            },
          );

        expect(result).toEqual({
          ...copiedDraft,
          itemCount: 30,
          dayCount: 1,
        });

        expect(
          snapshotCreateMany,
        ).toHaveBeenCalledWith({
          data: [
            {
              cinemaId: 1,
              draftId: 52,
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                7,
              note:
                'Kopieret note',
            },
          ],
        });
      },
    );

    it(
      'kopierer også en kladde uden vagtforslag',
      async () => {
        const copiedEmptyDraft = {
          ...draftRow,
          id: 53,
          note:
            'Tom kladde - kopi',
        };

        const queryRaw =
          jest.fn().mockResolvedValue([
            copiedEmptyDraft,
          ]);

        const executeRaw =
          jest.fn().mockResolvedValue(
            0,
          );

        const snapshotFindMany =
          jest.fn().mockResolvedValue([
            {
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                null,
              note:
                'Kun dagsnapshot',
            },
          ]);

        const snapshotCreateMany =
          jest.fn().mockResolvedValue({
            count: 1,
          });

        const transactionClient = {
          $queryRaw:
            queryRaw,
          $executeRaw:
            executeRaw,
          shiftPlanningDraftDay: {
            findMany:
              snapshotFindMany,
            createMany:
              snapshotCreateMany,
          },
        };

        const prisma = {
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        const result =
          await copyNamedShiftPlanningDraft(
            prisma,
            {
              sourceDraftId: 41,
              cinemaId: 1,
              name:
                'Tom kladde - kopi',
              actorUserId: 7,
            },
          );

        expect(result).toEqual({
          ...copiedEmptyDraft,
          itemCount: 0,
          dayCount: 1,
        });

        expect(
          snapshotCreateMany,
        ).toHaveBeenCalledWith({
          data: [
            {
              cinemaId: 1,
              draftId: 53,
              date:
                new Date(
                  '2026-08-27T00:00:00.000Z',
                ),
              isActive: false,
              scheduleTemplateId:
                null,
              note:
                'Kun dagsnapshot',
            },
          ],
        });
      },
    );

    it(
      'afviser en ukendt kladde',
      async () => {
        const transactionClient = {
          $queryRaw:
            jest.fn()
              .mockResolvedValue([]),
          $executeRaw:
            jest.fn(),
          shiftPlanningDraftDay: {
            findMany:
              jest.fn(),
            createMany:
              jest.fn(),
          },
        };

        const prisma = {
          $transaction:
            jest.fn(
              async (callback) =>
                callback(
                  transactionClient,
                ),
            ),
        } as any;

        await expect(
          copyNamedShiftPlanningDraft(
            prisma,
            {
              sourceDraftId:
                999,
              cinemaId: 1,
              name: 'Kopi',
              actorUserId: 7,
            },
          ),
        ).rejects.toBeInstanceOf(
          ShiftPlanningNamedDraftNotFoundError,
        );

        expect(
          transactionClient
            .$executeRaw,
        ).not.toHaveBeenCalled();
      },
    );
  },
);
