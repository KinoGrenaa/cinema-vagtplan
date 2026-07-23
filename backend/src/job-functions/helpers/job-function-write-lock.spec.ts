import type { PrismaService } from '../../prisma/prisma.service';
import { withJobFunctionCinemaLock } from './job-function-service-helpers';

describe('withJobFunctionCinemaLock', () => {
  it('casts both advisory lock keys to PostgreSQL integer values', async () => {
    const executeRaw = jest.fn().mockResolvedValue(0);
    const transaction = {
      $executeRaw: executeRaw,
    };
    const prisma = {
      $transaction: jest.fn(
        async (action: (client: typeof transaction) => Promise<unknown>) =>
          action(transaction),
      ),
    };

    const result = await withJobFunctionCinemaLock(
      prisma as unknown as PrismaService,
      42,
      async () => 'ok',
    );

    expect(result).toBe('ok');
    expect(executeRaw).toHaveBeenCalledTimes(1);

    const [queryParts, namespace, cinemaId] = executeRaw.mock.calls[0] as [
      readonly string[],
      number,
      number,
    ];
    const sql = queryParts.join('');

    expect(sql.match(/::integer/g)).toHaveLength(2);
    expect(namespace).toBe(1_245_660_518);
    expect(cinemaId).toBe(42);
  });
});
