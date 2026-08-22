import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe('leave request status advisory locks', () => {
  it('bruger executeRaw og PostgreSQL integer/integer-overload for begge locks', () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          'src/leave-requests/helpers/leave-request-status-flow.ts',
        ),
        'utf8',
      );

    expect(
      source.match(
        /await tx\.\$executeRaw\(/g,
      )?.length,
    ).toBe(
      2,
    );

    expect(
      source,
    ).not.toContain(
      'await tx.$queryRaw(',
    );

    expect(
      source,
    ).toContain(
      '54002::integer',
    );
    expect(
      source,
    ).toContain(
      '${requestId}::integer',
    );
    expect(
      source,
    ).toContain(
      '54001::integer',
    );
    expect(
      source,
    ).toContain(
      '${existing.userId}::integer',
    );
  });
});
