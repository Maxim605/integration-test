import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { Pool } from 'pg';
import { createTestPool } from '../setup/db-pool';
import { TestEnvironmentManager } from '../setup/environment-manager';
import { TestEnvironmentConfig } from '../setup/types';

const testConfig: TestEnvironmentConfig = {
  services: [
    {
      name: 'test-db',
      type: 'database',
      config: {
        type: 'postgres',
        version: '15-alpine',
        user: 'postgres',
        password: 'admin',
        database: 'test-db',
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'SERIAL', primaryKey: true },
              { name: 'login', type: 'VARCHAR(255)', nullable: false, unique: true },
              { name: 'password', type: 'VARCHAR(255)', nullable: false },
              { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
            ],
            indexes: [
              { name: 'idx_login', columns: ['login'], unique: true }
            ]
          }
        ],
        data: {
          users: [
            { login: '122', password: '122' }
          ]
        }
      }
    },
    {
      name: 'mock-api',
      type: 'http-mock',
      config: {
        port: 3001,
        routes: [
          {
            method: 'POST',
            path: '/auth/login',
            response: {
              status: 200,
              body: {
                status: 'ok'
              }
            }
          }
        ],
        middleware: [
          { type: 'cors' },
          { type: 'logging' }
        ]
      }
    }
  ],
  globalConfig: {
    TEST_DB_HOST: '${test-db.host}',
    TEST_DB_PORT: '${test-db.port}',
    TEST_DB_USER: '${test-db.user}',
    TEST_DB_PASSWORD: '${test-db.password}',
    TEST_DB_NAME: '${test-db.database}',
    TEST_API_URL: 'http://localhost:3000',
    MOCK_BASE_URL: 'http://localhost:3001',
    DATABASE_HOST: '${test-db.host}',
    DATABASE_PORT: '${test-db.port}',
    DATABASE_USER: '${test-db.user}',
    DATABASE_PASSWORD: '${test-db.password}',
    DATABASE_NAME: '${test-db.database}',
  }
};


describe('Интеграционные тесты аутентификации', () => {
  let app: INestApplication;
  let dbPool: Pool;
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
    await manager.initializeEnvironment(testConfig);

    process.env.DATABASE_HOST = manager.getServiceConnectionInfo('test-db').host;
    process.env.DATABASE_PORT = manager.getServiceConnectionInfo('test-db').port.toString();
    process.env.DATABASE_USER = manager.getServiceConnectionInfo('test-db').user;
    process.env.DATABASE_PASSWORD = manager.getServiceConnectionInfo('test-db').password;
    process.env.DATABASE_NAME = manager.getServiceConnectionInfo('test-db').database;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();   
    dbPool = createTestPool(manager.getServiceConnectionInfo('test-db'));
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
      const loginData = { login: 'testuser', password: '42' };
      await request(app.getHttpServer())
        .post('/login')
        .send(loginData)
        .expect(201);
      const response = await request(app.getHttpServer())
        .post('/login')
        .send({ ...loginData, password: '42' })
        .expect(201);
      expect(response.body).toEqual({ status: 'ok' });
      const dbResult = await dbPool.query(
        'SELECT * FROM users WHERE login = $1',
        [loginData.login]
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].password).toBe('42');
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
      const loginData = { login: 'testuser', password: '42' };
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