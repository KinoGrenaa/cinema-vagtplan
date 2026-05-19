import { Test, TestingModule } from '@nestjs/testing';
import { ShiftTradesController } from './shift-trades.controller';

describe('ShiftTradesController', () => {
  let controller: ShiftTradesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftTradesController],
    }).compile();

    controller = module.get<ShiftTradesController>(ShiftTradesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
