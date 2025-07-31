import { TestEnvironmentManager } from '../setup/environment-manager';
import { TestEnvironmentConfig } from '../setup/types';

describe('Complete test of all services', () => {
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
  });

  afterAll(async () => {
    await manager.cleanup();
  });

  describe('PostgreSQL, HTTP Mock, LDAP test', () => {
    const completeConfig: TestEnvironmentConfig = {
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
                  { name: 'email', type: 'VARCHAR(100)', nullable: false },
                  { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' }
                ],
                indexes: [
                  { name: 'idx_username', columns: ['username'], unique: true }
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
            port: 3001,
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
              },
              {
                method: 'POST',
                path: '/api/auth/login',
                response: {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                  body: {
                    token: 'mock-jwt-token',
                    expires_in: 3600,
                    user: {
                      id: 1,
                      username: 'testuser',
                      email: 'test@example.com'
                    }
                  }
                }
              }
            ],
            middleware: [
              { type: 'cors' },
              { type: 'logging' }
            ]
          }
        },

        {
          name: 'test-ldap',
          type: 'ldap',
          config: {
            port: 389,
            baseDN: 'dc=test,dc=com',
            users: [
              {
                dn: 'uid=testuser,ou=users,dc=test,dc=com',
                password: 'testpass',
                attributes: {
                  uid: 'testuser',
                  cn: 'Test User',
                  sn: 'User',
                  mail: 'testuser@test.com'
                }
              }
            ],
            groups: [
              {
                dn: 'cn=testgroup,ou=groups,dc=test,dc=com',
                members: ['uid=testuser,ou=users,dc=test,dc=com'],
                attributes: {
                  cn: 'testgroup',
                  description: 'Test group'
                }
              }
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
        TEST_API_URL: 'http://localhost:3001',
        TEST_LDAP_URL: 'ldap://localhost:389',
        TEST_LDAP_BASE_DN: 'dc=test,dc=com'
      }
    };

    beforeEach(async () => {
      await manager.cleanup();
      await manager.initializeEnvironment(completeConfig);
    });

    it('должен иметь доступ к базе данных', () => {
      const dbInfo = manager.getServiceConnectionInfo('test-db');
      expect(dbInfo).toBeDefined();
      expect(dbInfo.host).toBeDefined();
      expect(dbInfo.port).toBeDefined();
      expect(dbInfo.database).toBe('test-db');
      
      expect(process.env.TEST_DB_HOST).toBe(dbInfo.host);
      expect(process.env.TEST_DB_PORT).toBe(dbInfo.port.toString());
      expect(process.env.TEST_DB_USER).toBe('postgres');
      expect(process.env.TEST_DB_PASSWORD).toBe('admin');
      expect(process.env.TEST_DB_NAME).toBe('test-db');
    });

    it('должен иметь доступ к HTTP API', async () => {
      const apiInfo = manager.getServiceConnectionInfo('test-api');
      expect(apiInfo).toBeDefined();
      expect(apiInfo.host).toBe('localhost');
      expect(apiInfo.port).toBe(3001);
      expect(apiInfo.baseUrl).toBe('http://localhost:3001');

      const healthResponse = await fetch(`${apiInfo.baseUrl}/api/health`);
      expect(healthResponse.status).toBe(200);
      
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('ok');
      expect(healthData.message).toBe('API is working');

      const userResponse = await fetch(`${apiInfo.baseUrl}/api/users/123`);
      expect(userResponse.status).toBe(200);
      
      const userData = await userResponse.json();
      expect(userData.id).toBe('123');
      expect(userData.username).toBe('testuser');
      expect(userData.email).toBe('test@example.com');

      const authResponse = await fetch(`${apiInfo.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'testuser',
          password: 'password123'
        })
      });
      
      expect(authResponse.status).toBe(200);
      const authData = await authResponse.json();
      expect(authData.token).toBe('mock-jwt-token');
      expect(authData.user.username).toBe('testuser');
    });

    it('должен иметь доступ к LDAP серверу', () => {
      const ldapInfo = manager.getServiceConnectionInfo('test-ldap');
      expect(ldapInfo).toBeDefined();
      expect(ldapInfo.host).toBe('localhost');
      expect(ldapInfo.port).toBe(389);
      expect(ldapInfo.baseDN).toBe('dc=test,dc=com');
      expect(ldapInfo.url).toBe('ldap://localhost:389');
      
      expect(process.env.TEST_LDAP_URL).toBe('ldap://localhost:389');
      expect(process.env.TEST_LDAP_BASE_DN).toBe('dc=test,dc=com');
    });

    it('должен иметь информацию о всех сервисах', () => {
      const servicesInfo = manager.getServicesInfo();
      
      expect(servicesInfo['test-db']).toBeDefined();
      expect(servicesInfo['test-db'].type).toBe('database');
      
      expect(servicesInfo['test-api']).toBeDefined();
      expect(servicesInfo['test-api'].type).toBe('http-mock');
      
      expect(servicesInfo['test-ldap']).toBeDefined();
      expect(servicesInfo['test-ldap'].type).toBe('ldap');
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