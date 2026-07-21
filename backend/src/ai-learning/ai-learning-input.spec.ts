import { BadRequestException } from '@nestjs/common';
import {
  normalizeAiLearningEvent,
  normalizeAiLearningMetadata,
  parseAiLearningCinemaId,
} from './ai-learning-input';

describe('AI learning input', () => {
  it('normalizes a valid event', () => {
    expect(
      normalizeAiLearningEvent({
        cinemaId: '7',
        type: ' emergency_staffing ',
        severity: ' warning ',
        metadata: {
          requestId: 12,
          predictedAt: new Date(
            '2026-07-21T08:00:00.000Z',
          ),
        },
      }),
    ).toEqual({
      cinemaId: 7,
      type: 'EMERGENCY_STAFFING',
      severity: 'WARNING',
      metadata: {
        requestId: 12,
        predictedAt:
          '2026-07-21T08:00:00.000Z',
      },
    });
  });

  it.each([
    '',
    '0',
    '-1',
    '1.5',
    '1e2',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema ID %p', (value) => {
    expect(() =>
      parseAiLearningCinemaId(value),
    ).toThrow(BadRequestException);
  });

  it.each([
    undefined,
    null,
    '',
    'event with spaces',
    'event/path',
    'x'.repeat(101),
  ])('rejects invalid event type %p', (type) => {
    expect(() =>
      normalizeAiLearningEvent({
        cinemaId: 7,
        type,
      }),
    ).toThrow(BadRequestException);
  });

  it.each([
    'warning level',
    'warning/path',
    'x'.repeat(31),
    12,
  ])('rejects invalid severity %p', (severity) => {
    expect(() =>
      normalizeAiLearningEvent({
        cinemaId: 7,
        type: 'TEST_EVENT',
        severity,
      }),
    ).toThrow(BadRequestException);
  });

  it('allows omitted metadata', () => {
    expect(
      normalizeAiLearningMetadata(undefined),
    ).toBeUndefined();
    expect(
      normalizeAiLearningMetadata(null),
    ).toBeUndefined();
  });

  it('accepts nested JSON-compatible metadata', () => {
    expect(
      normalizeAiLearningMetadata({
        users: [1, 2, 3],
        active: true,
        score: 12.5,
        note: null,
      }),
    ).toEqual({
      users: [1, 2, 3],
      active: true,
      score: 12.5,
      note: null,
    });
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    () => 'value',
    1n,
    new Map(),
    new Date('invalid'),
  ])('rejects unsupported metadata %p', (metadata) => {
    expect(() =>
      normalizeAiLearningMetadata(metadata),
    ).toThrow(BadRequestException);
  });

  it('rejects circular metadata', () => {
    const metadata: {
      self?: unknown;
    } = {};
    metadata.self = metadata;

    expect(() =>
      normalizeAiLearningMetadata(metadata),
    ).toThrow(BadRequestException);
  });

  it('rejects oversized metadata', () => {
    expect(() =>
      normalizeAiLearningMetadata({
        text: 'x'.repeat(65 * 1024),
      }),
    ).toThrow(BadRequestException);
  });
});
