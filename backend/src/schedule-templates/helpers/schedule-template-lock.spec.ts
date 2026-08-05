import {
  getScheduleTemplateCinemaLockKey,
  withScheduleTemplateCinemaLock,
} from './schedule-template-service-helpers';

describe('schedule-template advisory lock', () => {
  it('pakker namespace og biograf-id i én bigint-nøgle', () => {
    const first = getScheduleTemplateCinemaLockKey(1);
    const second = getScheduleTemplateCinemaLockKey(2);

    expect(typeof first).toBe('bigint');
    expect(first).not.toBe(second);
    expect(first & 0xffff_ffffn).toBe(1n);
    expect(second & 0xffff_ffffn).toBe(2n);
  });

  it('kalder PostgreSQLs gyldige én-argumentsvariant', async () => {
    const executeRaw = jest.fn().mockResolvedValue(1);
    const transaction = {
      $executeRaw: executeRaw,
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => unknown) =>
          callback(transaction),
      ),
    };

    await withScheduleTemplateCinemaLock(
      prisma as never,
      17,
      async () => 'ok',
    );

    expect(executeRaw).toHaveBeenCalledTimes(1);
    const call = executeRaw.mock.calls[0];
    expect(call).toHaveLength(2);
    expect(call[1]).toBe(getScheduleTemplateCinemaLockKey(17));
  });
});
