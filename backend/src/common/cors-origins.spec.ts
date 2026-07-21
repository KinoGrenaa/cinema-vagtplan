import { getAllowedCorsOrigins } from './cors-origins';

describe('getAllowedCorsOrigins', () => {
  it('uses localhost as default', () => {
    expect(getAllowedCorsOrigins({})).toEqual([
      'http://localhost:3000',
    ]);
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      getAllowedCorsOrigins({
        BACKEND_CORS_ORIGIN:
          ' https://kino.example.dk,https://kino.example.dk/ , http://localhost:3000 ',
      }),
    ).toEqual([
      'https://kino.example.dk',
      'http://localhost:3000',
    ]);
  });

  it('uses the documented HTTP environment priority', () => {
    expect(
      getAllowedCorsOrigins({
        BACKEND_CORS_ORIGIN: 'https://backend.example.dk',
        CORS_ORIGIN: 'https://cors.example.dk',
        FRONTEND_ORIGIN: 'https://frontend.example.dk',
      }),
    ).toEqual(['https://backend.example.dk']);
  });

  it('supports realtime-specific environment priority', () => {
    expect(
      getAllowedCorsOrigins(
        {
          BACKEND_CORS_ORIGIN: 'https://backend.example.dk',
          REALTIME_CORS_ORIGIN:
            'https://realtime.example.dk',
          FRONTEND_ORIGIN: 'https://frontend.example.dk',
        },
        [
          'REALTIME_CORS_ORIGIN',
          'FRONTEND_ORIGIN',
          'BACKEND_CORS_ORIGIN',
          'CORS_ORIGIN',
        ],
      ),
    ).toEqual(['https://realtime.example.dk']);
  });

  it.each([
    '*',
    '',
    'kino.example.dk',
    'ftp://kino.example.dk',
    'https://user:pass@kino.example.dk',
    'https://kino.example.dk/path',
    'https://kino.example.dk?query=1',
    'https://kino.example.dk#fragment',
  ])('rejects invalid origin %p', (origin) => {
    expect(() =>
      getAllowedCorsOrigins({
        BACKEND_CORS_ORIGIN: origin,
      }),
    ).toThrow();
  });
});
