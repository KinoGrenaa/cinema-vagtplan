import { MasterUsersController } from './master-users.controller';

describe('MasterUsersController', () => {
  it('videresender MASTER-listen fra servicen', async () => {
    const users = [
      {
        id: 3,
        role: 'MASTER',
      },
    ];
    const service = {
      findAll: jest.fn().mockResolvedValue(users),
    };
    const controller = new MasterUsersController(
      service as never,
    );

    await expect(controller.findAll()).resolves.toEqual(users);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });
});
