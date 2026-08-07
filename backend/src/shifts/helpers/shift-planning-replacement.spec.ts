import {
  assertPlanningShiftReplacementCanExecute,
  assertPlanningShiftReplacementConfirmation,
  buildPlanningShiftReplacementPreviewFromItems,
  buildPlanningShiftReplacementRange,
  partitionPlanningShiftReplacementByNow,
  PLANNING_SHIFT_REPLACEMENT_CONFIRMATION_TEXT,
  type PlanningShiftReplacementExistingItem,
  type PlanningShiftReplacementProposedItem,
} from './shift-planning-replacement';

const checkedAt = new Date('2026-08-07T07:00:00.000Z');

function existing(
  overrides: Partial<PlanningShiftReplacementExistingItem> = {},
): PlanningShiftReplacementExistingItem {
  return {
    shiftId: 10,
    dateKey: '2026-08-17',
    startTime: new Date('2026-08-17T14:00:00.000Z'),
    endTime: new Date('2026-08-17T19:35:00.000Z'),
    userId: null,
    userName: null,
    jobFunctionId: 2,
    jobFunctionName: 'A Vagt Hverdag',
    canRemove: true,
    blockReasons: [],
    ...overrides,
  };
}

function proposed(
  overrides: Partial<PlanningShiftReplacementProposedItem> = {},
): PlanningShiftReplacementProposedItem {
  return {
    draftItemId: 50,
    dateKey: '2026-08-17',
    startTime: new Date('2026-08-17T14:15:00.000Z'),
    endTime: new Date('2026-08-17T19:45:00.000Z'),
    userId: null,
    userName: null,
    jobFunctionId: 2,
    jobFunctionName: 'A Vagt Hverdag',
    jobFunctionColor: '#2563eb',
    requiredIndex: 1,
    canCreate: true,
    blockReasons: [],
    ...overrides,
  };
}

describe('shift planning replacement preview', () => {
  it('begrænser en randuge til kladdens måned', () => {
    const firstWeek = buildPlanningShiftReplacementRange(
      'WEEK',
      '2026-08-01',
      2026,
      8,
    );
    expect(firstWeek.startDateKey).toBe('2026-08-01');
    expect(firstWeek.endDateKey).toBe('2026-08-02');

    const lastWeek = buildPlanningShiftReplacementRange(
      'WEEK',
      '2026-08-31',
      2026,
      8,
    );
    expect(lastWeek.startDateKey).toBe('2026-08-31');
    expect(lastWeek.endDateKey).toBe('2026-08-31');
  });

  it('er klar når både de gamle og nye vagter er sikre', () => {
    const range = buildPlanningShiftReplacementRange(
      'WEEK',
      '2026-08-20',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Ny uge 34',
      range,
      [existing(), existing({ shiftId: 11, dateKey: '2026-08-18' })],
      [proposed(), proposed({ draftItemId: 51, dateKey: '2026-08-18' })],
      checkedAt,
    );

    expect(preview.summary).toMatchObject({
      existingShiftCount: 2,
      removableShiftCount: 2,
      blockedExistingShiftCount: 0,
      proposedShiftCount: 2,
      creatableShiftCount: 2,
      blockedProposedShiftCount: 0,
      canReplace: true,
    });
  });

  it('blokerer hele erstatningen hvis en eksisterende vagt ikke kan fjernes', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [
        existing({
          canRemove: false,
          blockReasons: ['Vagten har tidsregistrering og kan ikke erstattes her.'],
        }),
      ],
      [proposed()],
      checkedAt,
    );

    expect(preview.summary.canReplace).toBe(false);
    expect(preview.summary.blockedExistingShiftCount).toBe(1);
    expect(preview.blockingReasons[0]).toContain('tidsregistrering');
  });

  it('blokerer hele erstatningen hvis et nyt forslag har en konflikt', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [existing()],
      [
        proposed({
          canCreate: false,
          blockReasons: [
            'Der findes allerede en tilsvarende vagt, som ikke fjernes ved erstatningen.',
          ],
        }),
      ],
      checkedAt,
    );

    expect(preview.summary.canReplace).toBe(false);
    expect(preview.summary.blockedProposedShiftCount).toBe(1);
  });

  it('kræver eksisterende vagter men tillader at erstatte med en tom kladde', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );

    const withoutExisting = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [],
      [proposed()],
      checkedAt,
    );
    expect(withoutExisting.summary.canReplace).toBe(false);
    expect(withoutExisting.blockingReasons).toContain(
      'Der er ingen fremtidige planlægningsoprettede vagter at erstatte i perioden.',
    );

    const withoutProposed = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [existing()],
      [],
      checkedAt,
    );
    expect(withoutProposed.summary).toMatchObject({
      existingShiftCount: 1,
      removableShiftCount: 1,
      proposedShiftCount: 0,
      creatableShiftCount: 0,
      blockedExistingShiftCount: 0,
      blockedProposedShiftCount: 0,
      canReplace: true,
    });
    expect(withoutProposed.blockingReasons).toEqual([]);
    expect(() =>
      assertPlanningShiftReplacementCanExecute(withoutProposed),
    ).not.toThrow();
  });

  it('kræver den eksplicitte bekræftelse før en erstatning', () => {
    expect(() =>
      assertPlanningShiftReplacementConfirmation('FJERN VAGTER'),
    ).toThrow('Bekræft erstatningen');

    expect(() =>
      assertPlanningShiftReplacementConfirmation(
        PLANNING_SHIFT_REPLACEMENT_CONFIRMATION_TEXT,
      ),
    ).not.toThrow();
  });

  it('afviser execution hvis previewet ikke er sikkert', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [
        existing({
          canRemove: false,
          blockReasons: ['Vagten har tidsregistrering og kan ikke erstattes her.'],
        }),
      ],
      [proposed()],
      checkedAt,
    );

    expect(() =>
      assertPlanningShiftReplacementCanExecute(preview),
    ).toThrow('tidsregistrering');
  });

  it('accepterer execution når previewet er fuldt sikkert', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [existing()],
      [proposed()],
      checkedAt,
    );

    expect(() =>
      assertPlanningShiftReplacementCanExecute(preview),
    ).not.toThrow();
  });


  it('beholder startede og tidligere vagter uden at lade dem blokere fremtiden', () => {
    const now = new Date('2026-08-07T09:41:00.000Z');
    const partition = partitionPlanningShiftReplacementByNow(
      [
        existing({
          shiftId: 1,
          dateKey: '2026-08-06',
          startTime: new Date('2026-08-06T14:00:00.000Z'),
        }),
        existing({
          shiftId: 2,
          dateKey: '2026-08-07',
          startTime: new Date('2026-08-07T09:00:00.000Z'),
          endTime: new Date('2026-08-07T12:00:00.000Z'),
        }),
        existing({
          shiftId: 3,
          dateKey: '2026-08-07',
          startTime: new Date('2026-08-07T14:00:00.000Z'),
        }),
      ],
      [
        proposed({
          draftItemId: 1,
          dateKey: '2026-08-06',
          startTime: new Date('2026-08-06T14:00:00.000Z'),
        }),
        proposed({
          draftItemId: 2,
          dateKey: '2026-08-07',
          startTime: new Date('2026-08-07T09:00:00.000Z'),
        }),
        proposed({
          draftItemId: 3,
          dateKey: '2026-08-07',
          startTime: new Date('2026-08-07T14:00:00.000Z'),
        }),
      ],
      now,
    );

    expect(partition.retainedExistingItems.map((item) => item.shiftId)).toEqual([
      1,
      2,
    ]);
    expect(
      partition.actionableExistingItems.map((item) => item.shiftId),
    ).toEqual([3]);
    expect(
      partition.ignoredPastProposedItems.map((item) => item.draftItemId),
    ).toEqual([1, 2]);
    expect(
      partition.actionableProposedItems.map((item) => item.draftItemId),
    ).toEqual([3]);
  });

  it('ignorerer et ugyldigt kladdepunkt på en tidligere dato men ikke på i dag', () => {
    const now = new Date('2026-08-07T09:41:00.000Z');
    const partition = partitionPlanningShiftReplacementByNow(
      [],
      [
        proposed({
          draftItemId: 10,
          dateKey: '2026-08-06',
          startTime: null,
          endTime: null,
          canCreate: false,
          blockReasons: ['Mangler mødetid eller fyraften.'],
        }),
        proposed({
          draftItemId: 11,
          dateKey: '2026-08-07',
          startTime: null,
          endTime: null,
          canCreate: false,
          blockReasons: ['Mangler mødetid eller fyraften.'],
        }),
      ],
      now,
    );

    expect(
      partition.ignoredPastProposedItems.map((item) => item.draftItemId),
    ).toEqual([10]);
    expect(
      partition.actionableProposedItems.map((item) => item.draftItemId),
    ).toEqual([11]);
  });

  it('viser fortiden som beholdt uden at gøre et ellers sikkert preview blokeret', () => {
    const range = buildPlanningShiftReplacementRange(
      'WEEK',
      '2026-08-07',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Uge 32',
      range,
      [existing({ shiftId: 30, dateKey: '2026-08-07' })],
      [proposed({ draftItemId: 60, dateKey: '2026-08-07' })],
      checkedAt,
      {
        retainedExistingShiftCount: 6,
        ignoredPastProposedShiftCount: 6,
      },
    );

    expect(preview.summary).toMatchObject({
      existingShiftCount: 1,
      proposedShiftCount: 1,
      retainedExistingShiftCount: 6,
      ignoredPastProposedShiftCount: 6,
      blockedExistingShiftCount: 0,
      blockedProposedShiftCount: 0,
      canReplace: true,
    });
    expect(preview.blockingReasons).toEqual([]);
  });


  it('bevarer kravet om mindst én eksisterende planlægningsvagt i replacement-flowet', () => {
    const range = buildPlanningShiftReplacementRange(
      'DAY',
      '2026-08-17',
      2026,
      8,
    );
    const preview = buildPlanningShiftReplacementPreviewFromItems(
      1,
      7,
      'Test',
      range,
      [],
      [proposed()],
      checkedAt,
    );

    expect(preview.summary.canReplace).toBe(false);
    expect(() =>
      assertPlanningShiftReplacementCanExecute(preview),
    ).toThrow('ingen fremtidige planlægningsoprettede vagter');
  });

});
