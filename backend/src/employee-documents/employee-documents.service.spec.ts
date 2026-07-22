import { EmployeeDocumentsService } from './employee-documents.service';

describe('EmployeeDocumentsService', () => {
  it('should be defined', () => {
    const service = new EmployeeDocumentsService(
      {} as never,
    );

    expect(service).toBeDefined();
  });
});
