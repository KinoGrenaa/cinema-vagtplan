import {
  applyPublicationSafetyBlocks,
  EXISTING_SHIFT_BLOCK_REASON,
  getPublicationSafetyInstantRange,
  PAST_DRAFT_ITEM_BLOCK_REASON,
  partitionPublicationDraftItems,
  type PublicationSafetyDraftItem,
} from './shift-planning-publication-safety';

function buildItem(
  overrides: Partial<PublicationSafetyDraftItem> = {},
): PublicationSafetyDraftItem {
  return {
    dateKey: '2026-08-05',
    jobFunctionId: 12,
    startTime: new Date('2026-08-05T14:00:00.000Z'),
    endTime: new Date('2026-08-05T19:35:00.000Z'),
    canBecomeShift: true,
    blockReasons: [],
    ...overrides,
  };
}

describe('shift planning publication safety', () => {
  it('blokerer overståede datoer efter kalenderdatoen i København', () => {
    const yesterday = buildItem({ dateKey: '2026-08-04' });
    const today = buildItem({ dateKey: '2026-08-05' });

    applyPublicationSafetyBlocks(
      [yesterday, today],
      [],
      new Date('2026-08-04T22:30:00.000Z'),
    );

    expect(yesterday.canBecomeShift).toBe(false);
    expect(yesterday.blockReasons).toContain(PAST_DRAFT_ITEM_BLOCK_REASON);
    expect(today.canBecomeShift).toBe(true);
  });

  it('blokerer kun så mange identiske kladdeposter som allerede findes', () => {
    const firstItem = buildItem();
    const secondItem = buildItem();

    applyPublicationSafetyBlocks(
      [firstItem, secondItem],
      [
        {
          id: 91,
          jobFunctionId: 12,
          startTime: '2026-08-05T14:00:00.000Z',
          endTime: '2026-08-05T19:35:00.000Z',
        },
      ],
      new Date('2026-08-05T08:00:00.000Z'),
    );

    expect(firstItem.canBecomeShift).toBe(false);
    expect(firstItem.blockReasons).toContain(EXISTING_SHIFT_BLOCK_REASON);
    expect(secondItem.canBecomeShift).toBe(true);
  });

  it('betragter ikke en anden jobfunktion som en dublet', () => {
    const item = buildItem();

    applyPublicationSafetyBlocks(
      [item],
      [
        {
          id: 92,
          jobFunctionId: 99,
          startTime: '2026-08-05T14:00:00.000Z',
          endTime: '2026-08-05T19:35:00.000Z',
        },
      ],
      new Date('2026-08-05T08:00:00.000Z'),
    );

    expect(item.canBecomeShift).toBe(true);
    expect(item.blockReasons).toEqual([]);
  });

  it('finder det samlede tidsinterval for oprettelige poster', () => {
    const range = getPublicationSafetyInstantRange([
      buildItem({
        startTime: new Date('2026-08-05T14:00:00.000Z'),
        endTime: new Date('2026-08-05T19:35:00.000Z'),
      }),
      buildItem({
        startTime: new Date('2026-08-06T15:00:00.000Z'),
        endTime: new Date('2026-08-06T21:00:00.000Z'),
      }),
      buildItem({
        canBecomeShift: false,
        startTime: new Date('2026-08-01T10:00:00.000Z'),
        endTime: new Date('2026-08-01T11:00:00.000Z'),
      }),
    ]);

    expect(range).toEqual({
      start: new Date('2026-08-05T14:00:00.000Z'),
      end: new Date('2026-08-06T21:00:00.000Z'),
    });
  });

  it('holder overståede poster uden for aktive blokeringer og oprettelse', () => {
    const past = buildItem({ dateKey: '2026-08-04' });
    const ready = buildItem({ dateKey: '2026-08-05' });
    const blocked = buildItem({
      dateKey: '2026-08-05',
      canBecomeShift: false,
      blockReasons: ['Reel blokering'],
    });

    applyPublicationSafetyBlocks(
      [past, ready, blocked],
      [],
      new Date('2026-08-05T08:00:00.000Z'),
    );

    const partition = partitionPublicationDraftItems([
      past,
      ready,
      blocked,
    ]);

    expect(partition.pastItems).toEqual([past]);
    expect(partition.publishableItems).toEqual([ready]);
    expect(partition.blockedItems).toEqual([blocked]);
    expect(past.canBecomeShift).toBe(false);
    expect(past.blockReasons).toContain(PAST_DRAFT_ITEM_BLOCK_REASON);
  });

});
