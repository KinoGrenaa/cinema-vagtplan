import { findMovieStaffingIssues } from './movie-staffing-coverage';

describe('findMovieStaffingIssues', () => {
  it('matches a shift that starts before a later movie start', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T14:00:00.000Z'),
        endTime: new Date('2026-07-27T20:00:00.000Z'),
        shifts: [
          {
            cinemaId: 1,
            userId: 10,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T19:30:00.000Z'),
          },
          {
            cinemaId: 1,
            userId: 11,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T19:30:00.000Z'),
          },
        ],
        movieShowings: [
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T16:55:00.000Z'),
          },
        ],
      }),
    ).toEqual([]);
  });

  it('does not create a film-based issue when the cinema has no movies', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T14:00:00.000Z'),
        endTime: new Date('2026-07-27T20:00:00.000Z'),
        shifts: [
          {
            cinemaId: 1,
            userId: 10,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T19:30:00.000Z'),
          },
        ],
        movieShowings: [],
      }),
    ).toEqual([]);
  });

  it('raises the requirement only during overlapping movie intervals', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T14:00:00.000Z'),
        endTime: new Date('2026-07-27T20:00:00.000Z'),
        shifts: [10, 11, 12].map((userId) => ({
          cinemaId: 1,
          userId,
          startTime: new Date('2026-07-27T15:00:00.000Z'),
          endTime: new Date('2026-07-27T19:30:00.000Z'),
        })),
        movieShowings: [
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T17:00:00.000Z'),
          },
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T16:30:00.000Z'),
            endTime: new Date('2026-07-27T18:00:00.000Z'),
          },
        ],
      }),
    ).toEqual([
      {
        startTime: new Date('2026-07-27T16:30:00.000Z'),
        endTime: new Date('2026-07-27T17:00:00.000Z'),
        assignedStaff: 3,
        requiredStaff: 4,
        movieShowings: 2,
      },
    ]);
  });

  it('ignores unassigned shifts and does not count the same employee twice', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T14:00:00.000Z'),
        endTime: new Date('2026-07-27T20:00:00.000Z'),
        shifts: [
          {
            cinemaId: 1,
            userId: 10,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T17:00:00.000Z'),
          },
          {
            cinemaId: 1,
            userId: 10,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T17:00:00.000Z'),
          },
          {
            cinemaId: 1,
            userId: null,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T17:00:00.000Z'),
          },
        ],
        movieShowings: [
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T16:55:00.000Z'),
          },
        ],
      }),
    ).toEqual([
      {
        startTime: new Date('2026-07-27T15:15:00.000Z'),
        endTime: new Date('2026-07-27T16:55:00.000Z'),
        assignedStaff: 1,
        requiredStaff: 2,
        movieShowings: 1,
      },
    ]);
  });

  it('never lets another cinemas shifts cover the selected cinemas movies', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T14:00:00.000Z'),
        endTime: new Date('2026-07-27T20:00:00.000Z'),
        shifts: [
          {
            cinemaId: 2,
            userId: 20,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T19:30:00.000Z'),
          },
          {
            cinemaId: 2,
            userId: 21,
            startTime: new Date('2026-07-27T15:00:00.000Z'),
            endTime: new Date('2026-07-27T19:30:00.000Z'),
          },
        ],
        movieShowings: [
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T16:55:00.000Z'),
          },
          {
            cinemaId: 2,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T16:55:00.000Z'),
          },
        ],
      }),
    ).toEqual([
      {
        startTime: new Date('2026-07-27T15:15:00.000Z'),
        endTime: new Date('2026-07-27T16:55:00.000Z'),
        assignedStaff: 0,
        requiredStaff: 2,
        movieShowings: 1,
      },
    ]);
  });

  it('clips overlapping movies and shifts to the requested period', () => {
    expect(
      findMovieStaffingIssues({
        cinemaId: 1,
        startTime: new Date('2026-07-27T16:00:00.000Z'),
        endTime: new Date('2026-07-27T17:00:00.000Z'),
        shifts: [],
        movieShowings: [
          {
            cinemaId: 1,
            startTime: new Date('2026-07-27T15:15:00.000Z'),
            endTime: new Date('2026-07-27T18:00:00.000Z'),
          },
        ],
      }),
    ).toEqual([
      {
        startTime: new Date('2026-07-27T16:00:00.000Z'),
        endTime: new Date('2026-07-27T17:00:00.000Z'),
        assignedStaff: 0,
        requiredStaff: 2,
        movieShowings: 1,
      },
    ]);
  });
});
