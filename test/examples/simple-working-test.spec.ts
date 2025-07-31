import { TestEnvironmentManager } from '../setup/environment-manager';
import { TestEnvironmentConfig } from '../setup/types';

describe('Простой рабочий тест', () => {
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
  });

  afterAll(async () => {
    await manager.cleanup();
  });

  describe('Тест с базой данных и HTTP Mock', () => {
    const workingConfig: TestEnvironmentConfig = {
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
                  { name: 'username', type: 'VARCHAR(50)', nullable: false },
                  { name: 'email', type: 'VARCHAR(100)', nullable: false }
                ]
              }
            ],
            data: {
              users: [
                { username: 'testuser', email: 'test@example.com' }
              ]
            }
          }
        },

        {
          name: 'test-api',
          type: 'http-mock',
          config: {
            port: 3000,
            routes: [
              {
                method: 'GET',
                path: '/api/health',
                response: {
                  status: 200,
                  body: { status: 'ok', message: 'API is working' }
                }
              },
              {
                method: 'GET',
                path: '/api/users/:id',
                response: {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                  dynamic: (req: any) => ({
                    id: req.params.id,
                    username: 'testuser',
                    email: 'test@example.com'
                  })
                }
              }
            ]
          }
        }
      ],
      globalConfig: {
        TEST_DB_HOST: '${test-db.host}',
        TEST_DB_PORT: '${test-db.port}',
        TEST_API_URL: 'http://localhost:3000'
      }
    };

    beforeEach(async () => {
      await manager.cleanup();
      await manager.initializeEnvironment(workingConfig);
    });

    it('должен иметь доступ к базе данных', () => {
      const dbInfo = manager.getServiceConnectionInfo('test-db');
      expect(dbInfo).toBeDefined();
      expect(dbInfo.host).toBeDefined();
      expect(dbInfo.port).toBeDefined();
      expect(dbInfo.database).toBe('test-db');
      
      expect(process.env.TEST_DB_HOST).toBe(dbInfo.host);
      expect(process.env.TEST_DB_PORT).toBe(dbInfo.port.toString());
    });

    it('должен иметь доступ к HTTP API', async () => {
      const apiInfo = manager.getServiceConnectionInfo('test-api');
      expect(apiInfo).toBeDefined();
      expect(apiInfo.host).toBe('localhost');
      expect(apiInfo.port).toBe(3000);
      expect(apiInfo.baseUrl).toBe('http://localhost:3000');

      const response = await fetch(`${apiInfo.baseUrl}/api/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.message).toBe('API is working');
    });

    it('должен возвращать пользователя по ID', async () => {
      const apiInfo = manager.getServiceConnectionInfo('test-api');
      
      const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
      expect(response.status).toBe(200);
      
      const user = await response.json();
      expect(user.id).toBe('123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('должен иметь информацию о всех сервисах', () => {
      const servicesInfo = manager.getServicesInfo();
      
      expect(servicesInfo['test-db']).toBeDefined();
      expect(servicesInfo['test-db'].type).toBe('database');
      
      expect(servicesInfo['test-api']).toBeDefined();
      expect(servicesInfo['test-api'].type).toBe('http-mock');
    });

    it('должен корректно очищать ресурсы', async () => {
      const servicesBefore = manager.getServicesInfo();
      expect(Object.keys(servicesBefore).length).toBeGreaterThan(0);
      
      await manager.cleanup();
      
      const servicesAfter = manager.getServicesInfo();
      expect(Object.keys(servicesAfter).length).toBe(0);
    });
  });
}); 