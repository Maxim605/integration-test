import { TestEnvironmentManager } from '../setup/environment-manager';
import { TestEnvironmentConfig } from '../setup/types';

describe('Тест только HTTP Mock сервиса', () => {
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
  });

  afterAll(async () => {
    await manager.cleanup();
  });

  describe('Простой HTTP Mock тест', () => {
    const httpConfig: TestEnvironmentConfig = {
      services: [
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
                path: '/api/test',
                response: {
                  status: 200,
                  body: { message: 'Test endpoint' }
                }
              }
            ]
          }
        }
      ]
    };

    beforeEach(async () => {
      await manager.cleanup();
      await manager.initializeEnvironment(httpConfig);
    });

    it('должен иметь доступ к HTTP API', async () => {
      const apiInfo = manager.getServiceConnectionInfo('test-api');
      expect(apiInfo).toBeDefined();
      expect(apiInfo.host).toBe('localhost');
      expect(apiInfo.port).toBeGreaterThan(0);
      expect(apiInfo.baseUrl).toBe(`http://localhost:${apiInfo.port}`);

      // Тестируем API health
      const healthResponse = await fetch(`${apiInfo.baseUrl}/api/health`);
      expect(healthResponse.status).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('ok');
      expect(healthData.message).toBe('API is working');

      // Тестируем API test
      const testResponse = await fetch(`${apiInfo.baseUrl}/api/test`);
      expect(testResponse.status).toBe(200);
      
      const testData = await testResponse.json();
      expect(testData.message).toBe('Test endpoint');
    });

    it('должен возвращать 404 для несуществующих маршрутов', async () => {
      const apiInfo = manager.getServiceConnectionInfo('test-api');
      
      const notFoundResponse = await fetch(`${apiInfo.baseUrl}/api/not-found`);
      expect(notFoundResponse.status).toBe(404);
    });
  });
}); 