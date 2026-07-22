import { WorkTypesService } from './work-types.service';

describe('WorkTypesService', () => {
  it('should be defined', () => {
    const service = new WorkTypesService(
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
