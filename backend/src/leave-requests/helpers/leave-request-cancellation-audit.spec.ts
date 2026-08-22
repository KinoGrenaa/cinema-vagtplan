import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe('leave request cancellation audit', () => {
  it('persists the cancellation actor and timestamp', () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          'src/leave-requests/helpers/leave-request-status-flow.ts',
        ),
        'utf8',
      );

    expect(source).toContain(
      "params.status === 'CANCELLED'",
    );
    expect(source).toContain(
      'cancelledByUserId:',
    );
    expect(source).toContain(
      'actorUserId',
    );
    expect(source).toContain(
      'cancelledAt:',
    );
  });

  it('returns the cancellation actor in paged leave requests', () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          'src/leave-requests/helpers/leave-request-page.ts',
        ),
        'utf8',
      );

    expect(source).toContain(
      'cancelledByUser:',
    );
    expect(source).toContain(
      'firstName: true',
    );
    expect(source).toContain(
      'lastName: true',
    );
  });
});
