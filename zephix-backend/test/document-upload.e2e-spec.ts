import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DocumentUploadController } from '../src/ai/document-upload.controller';

describe('DocumentUploadController (e2e)', () => {
  let app: INestApplication;
  let documentUploadController: DocumentUploadController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    documentUploadController = moduleFixture.get<DocumentUploadController>(DocumentUploadController);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(documentUploadController).toBeDefined();
  });

  // Add more tests as needed
});
