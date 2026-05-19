import { Test, TestingModule } from '@nestjs/testing';
import { ShiftTradesService } from './shift-trades.service';

describe('ShiftTradesService', () => {
  let service: ShiftTradesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftTradesService],
    }).compile();

    service = module.get<ShiftTradesService>(ShiftTradesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
