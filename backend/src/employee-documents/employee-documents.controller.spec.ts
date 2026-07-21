import { BadRequestException } from '@nestjs/common';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';

describe('EmployeeDocumentsController input validation', () => {
  const req = {
    user: {
      sub: 10,
      role: 'MASTER',
      cinemaId: null,
    },
  };

  let service: {
    findForUser: jest.Mock;
    create: jest.Mock;
    getDownload: jest.Mock;
    delete: jest.Mock;
  };
  let controller: EmployeeDocumentsController;

  beforeEach(() => {
    service = {
      findForUser: jest.fn(),
      create: jest.fn(),
      getDownload: jest.fn(),
      delete: jest.fn(),
    };

    controller = new EmployeeDocumentsController(
      service as unknown as EmployeeDocumentsService,
    );
  });

  it('normalizes valid user and cinema IDs', () => {
    controller.findForUser(req, '8', '3');

    expect(service.findForUser).toHaveBeenCalledWith(
      req.user,
      8,
      3,
    );
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid user ID %p', (userId) => {
    expect(() =>
      controller.findForUser(req, userId, '1'),
    ).toThrow(BadRequestException);
    expect(service.findForUser).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid cinema ID %p', (cinemaId) => {
    expect(() =>
      controller.findForUser(req, '2', cinemaId),
    ).toThrow(BadRequestException);
    expect(service.findForUser).not.toHaveBeenCalled();
  });

  it('normalizes valid delete input', () => {
    controller.deleteDocument(req, '9', '4');

    expect(service.delete).toHaveBeenCalledWith(
      req.user,
      9,
      4,
    );
  });

  it.each([
    '',
    '1.5',
    '1e2',
    '-1',
    'abc',
    '9007199254740992',
  ])('rejects invalid document ID %p', (id) => {
    expect(() =>
      controller.deleteDocument(req, id, '1'),
    ).toThrow(BadRequestException);
    expect(service.delete).not.toHaveBeenCalled();
  });
});
