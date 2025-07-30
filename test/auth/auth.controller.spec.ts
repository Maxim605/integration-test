import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Тесты контроллера аутентификации', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('должен возвращать статус ok при корректных данных', async () => {
    const response = await request(app.getHttpServer())
      .post('/login')
      .send({ login: 'test', password: '42' })
      .expect(201);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('должен возвращать ошибку при некорректных данных', async () => {
    const response = await request(app.getHttpServer())
      .post('/login')
      .send({ login: '', password: '' })
      .expect(400);
    expect(response.body.message).toBeDefined();
  });
}); 