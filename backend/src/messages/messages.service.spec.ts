import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  it('should be defined', () => {
    const service = new MessagesService(
      {} as never,
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
