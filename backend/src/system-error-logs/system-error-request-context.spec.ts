import { createSystemErrorRequestContext } from './system-error-request-context';

describe('system error request context', () => {
  it('preserves a valid correlation ID and trusted user cinema', () => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-correlation-id': 'request-123',
      },
      user: {
        sub: 7,
        cinemaId: 4,
      },
    });

    expect(context.correlationId).toBe('request-123');
    expect(
      context.request.headers['x-correlation-id'],
    ).toBe('request-123');
    expect(context.request.user.cinemaId).toBe(4);
  });

  it('uses a valid request ID as fallback', () => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-request-id': 'gateway:42',
      },
    });

    expect(context.correlationId).toBe('gateway:42');
  });

  it.each([
    '',
    'with space',
    'line\nbreak',
    'x'.repeat(129),
  ])('replaces invalid correlation ID %p', (correlationId) => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-correlation-id': correlationId,
      },
    });

    expect(context.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('uses the first valid cinema context candidate', () => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-cinema-id': '8',
      },
      query: {
        cinemaId: '9',
      },
      user: {
        sub: 7,
        cinemaId: null,
      },
    });

    expect(context.request.user.cinemaId).toBe(8);
  });

  it('rejects exponent and unsafe cinema IDs', () => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-cinema-id': '1e2',
      },
      query: {
        cinemaId: '9007199254740992',
      },
      body: {
        cinemaId: '5',
      },
      user: {
        sub: 7,
        cinemaId: null,
      },
    });

    expect(context.request.user.cinemaId).toBe(5);
  });

  it('keeps cinema context null when no candidate is valid', () => {
    const context = createSystemErrorRequestContext({
      headers: {
        'x-cinema-id': '-1',
      },
      query: {
        cinemaId: '1.5',
      },
      user: {
        sub: 7,
        cinemaId: null,
      },
    });

    expect(context.request.user.cinemaId).toBeNull();
  });
});
