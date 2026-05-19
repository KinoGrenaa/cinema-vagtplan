import { Test, TestingModule } from '@nestjs/testing';
import { MovieShowingsService } from './movie-showings.service';

describe('MovieShowingsService', () => {
  let service: MovieShowingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovieShowingsService],
    }).compile();

    service = module.get<MovieShowingsService>(MovieShowingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
