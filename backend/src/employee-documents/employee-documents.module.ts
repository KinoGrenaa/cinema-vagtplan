import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmployeeDocumentListController } from './employee-document-list.controller';
import { EmployeeDocumentListService } from './employee-document-list.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

@Module({
  imports: [
    JwtModule.register({
      secret: 'super-secret-key-change-later',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    EmployeeDocumentsController,
    EmployeeDocumentListController,
  ],
  providers: [
    EmployeeDocumentsService,
    EmployeeDocumentListService,
  ],
})
export class EmployeeDocumentsModule {}
