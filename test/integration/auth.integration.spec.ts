import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Pool } from 'pg';
import { createTestPool } from '../setup/db-pool';

describe('Интеграционные тесты аутентификации', () => {
  let app: INestApplication;
  let dbPool: Pool;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

   db = 
   

    dbPool = createTestPool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'admin',
      database: process.env.DATABASE_NAME || 'lks-test',
    });
  });

  afterAll(async () => {
    await app.close();
    await dbPool.end();
  });

  beforeEach(async () => {
    await dbPool.query('DELETE FROM users');
  });

  describe('POST /login', () => {
    it('должен успешно создавать пользователя и возвращать статус ok', async () => {
      const loginData = { login: 'testuser', password: '42' };
      const response = await request(app.getHttpServer())
        .post('/login')
        .send(loginData)
        .expect(201);
      expect(response.body).toEqual({ status: 'ok' });
      const dbResult = await dbPool.query(
        'SELECT * FROM users WHERE login = $1',
        [loginData.login]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].login).toBe(loginData.login);
      expect(dbResult.rows[0].password).toBe(loginData.password);
    });

    it('должен корректно обрабатывать дублирующийся логин', async () => {
      const loginData = { login: 'duplicate', password: '42' };
      await request(app.getHttpServer())
        .post('/login')
        .send(loginData)
        .expect(201);
      const response = await request(app.getHttpServer())
        .post('/login')
        .send({ ...loginData, password: '52' })
        .expect(201);
      expect(response.body).toEqual({ status: 'ok' });
      const dbResult = await dbPool.query(
        'SELECT * FROM users WHERE login = $1',
        [loginData.login]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].password).toBe('52');
    });

    it('должен валидировать обязательные поля', async () => {
      const invalidData = { login: '', password: '' };
      const response = await request(app.getHttpServer())
        .post('/login')
        .send(invalidData)
        .expect(400);
      expect(response.body.message).toContain('login should not be empty');
      expect(response.body.message).toContain('password should not be empty');
    });

    it('должен обрабатывать отсутствие полей', async () => {
      const response = await request(app.getHttpServer())
        .post('/login')
        .send({})
        .expect(400);
      expect(response.body.message).toContain('login should not be empty');
      expect(response.body.message).toContain('password should not be empty');
    });

    it('должен обрабатывать некорректный JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/login')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Операции с базой данных', () => {
    it('должен создавать таблицу users с корректной схемой', async () => {
      const result = await dbPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
      );
      const columns = result.rows.map(r => r.column_name);
      expect(columns).toEqual(
        expect.arrayContaining(['id', 'login', 'password', 'created_at'])
      );
    });

    it('должен обрабатывать одновременное создание пользователей', async () => {
      const loginData = { login: 'test_user', password: '42' };
      const promises = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/login')
          .send(loginData)
      );
      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toEqual({ status: 'ok' });
      });
      const dbResult = await dbPool.query(
        'SELECT * FROM users WHERE login = $1',
        [loginData.login]
      );
      expect(dbResult.rows).toHaveLength(1);
    });
  });
}); 