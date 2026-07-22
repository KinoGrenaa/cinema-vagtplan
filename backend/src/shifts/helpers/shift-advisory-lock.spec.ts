import {
  acquireShiftAdvisoryLock,
  SHIFT_RECORD_LOCK_NAMESPACE,
  SHIFT_USER_LOCK_NAMESPACE,
} from './shift-advisory-lock';

describe('shift advisory lock', () => {
  it.each([
    [
      SHIFT_USER_LOCK_NAMESPACE,
      7,
    ],
    [
      SHIFT_RECORD_LOCK_NAMESPACE,
      12,
    ],
  ])(
    'executes a PostgreSQL advisory lock with integer arguments for namespace %s and resource %s',
    async (
      namespace,
      resourceId,
    ) => {
      const transaction = {
        $executeRaw:
          jest
            .fn()
            .mockResolvedValue(1),
      };

      await acquireShiftAdvisoryLock(
        transaction as never,
        namespace,
        resourceId,
      );

      expect(
        transaction.$executeRaw,
      ).toHaveBeenCalledTimes(1);

      const [
        queryParts,
        actualNamespace,
        actualResourceId,
      ] =
        transaction.$executeRaw.mock
          .calls[0];

      expect(
        Array.from(
          queryParts,
        ).join(''),
      ).toContain(
        'CAST( AS integer)',
      );
      expect(actualNamespace).toBe(
        namespace,
      );
      expect(actualResourceId).toBe(
        resourceId,
      );
    },
  );
});
