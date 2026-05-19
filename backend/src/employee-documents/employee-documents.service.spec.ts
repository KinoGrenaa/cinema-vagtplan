import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeDocumentsService } from './employee-documents.service';

describe('EmployeeDocumentsService', () => {
  let service: EmployeeDocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeDocumentsService],
    }).compile();

    service = module.get<EmployeeDocumentsService>(EmployeeDocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
