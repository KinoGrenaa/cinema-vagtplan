import { PayrollService } from './payroll.service';

describe('PayrollService', () => {
  it('should be defined', () => {
    const service = new PayrollService(
      {} as never,
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
