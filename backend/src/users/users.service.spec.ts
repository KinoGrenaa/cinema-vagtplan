import { UsersService } from './users.service';

describe('UsersService', () => {
  it('should be defined', () => {
    const service = new UsersService(
      {} as never,
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
