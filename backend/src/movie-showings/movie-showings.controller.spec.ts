import { Test, TestingModule } from '@nestjs/testing';
import { MovieShowingsController } from './movie-showings.controller';

describe('MovieShowingsController', () => {
  let controller: MovieShowingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovieShowingsController],
    }).compile();

    controller = module.get<MovieShowingsController>(MovieShowingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
