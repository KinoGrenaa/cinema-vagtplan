import {
  readFileSync,
} from 'node:fs';
import {
  resolve,
} from 'node:path';

describe('leave request advisory lock SQL', () => {
  it('bruger PostgreSQLs integer/integer overload eksplicit', () => {
    const source =
      readFileSync(
        resolve(
          process.cwd(),
          'src/leave-requests/helpers/leave-request-create-flow.ts',
        ),
        'utf8',
      );

    expect(
      source,
    ).toContain(
      'await tx.$executeRaw(',
    );
    expect(
      source,
    ).not.toContain(
      'await tx.$queryRaw(',
    );
    expect(
      source,
    ).toContain(
      '54001::integer',
    );
    expect(
      source,
    ).toContain(
      '${target.userId}::integer',
    );
    expect(
      source,
    ).not.toContain(
      '54001,\n              ${target.userId}',
    );
  });
});
