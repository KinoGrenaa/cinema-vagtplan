import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  it('should be defined', () => {
    const service = new ShiftsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
