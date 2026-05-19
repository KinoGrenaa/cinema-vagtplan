import { Test, TestingModule } from '@nestjs/testing';
import { WorkTypesController } from './work-types.controller';

describe('WorkTypesController', () => {
  let controller: WorkTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkTypesController],
    }).compile();

    controller = module.get<WorkTypesController>(WorkTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
