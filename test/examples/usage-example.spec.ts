import { TestEnvironmentManager } from "../setup/environment-manager";
import { TestEnvironmentConfig } from "../setup/types";

describe("Практический пример использования системы фабрик", () => {
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
  });

  afterAll(async () => {
    await manager.cleanup();
  });

  describe("Тест с пользователями и аутентификацией", () => {
    const userTestConfig: TestEnvironmentConfig = {
      services: [
        {
          name: "user-db",
          type: "database",
          config: {
            type: "postgres",
            version: "15-alpine",
            user: "postgres",
            password: "admin",
            database: "user-test",
            tables: [
              {
                name: "users",
                columns: [
                  { name: "id", type: "SERIAL", primaryKey: true },
                  { name: "username", type: "VARCHAR(50)", nullable: false },
                  { name: "email", type: "VARCHAR(100)", nullable: false },
                  { name: "password", type: "VARCHAR(255)", nullable: false },
                  {
                    name: "created_at",
                    type: "TIMESTAMP",
                    defaultValue: "CURRENT_TIMESTAMP",
                  },
                ],
                indexes: [
                  { name: "idx_username", columns: ["username"], unique: true },
                  { name: "idx_email", columns: ["email"], unique: true },
                ],
              },
            ],
            data: {
              users: [
                {
                  username: "testuser",
                  email: "test@example.com",
                  password: "hashed_password",
                },
              ],
            },
          },
        },

        {
          name: "auth-api",
          type: "http-mock",
          config: {
            port: 3001,
            routes: [
              {
                method: "POST",
                path: "/api/auth/login",
                response: {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                  body: {
                    token: "mock-jwt-token-12345",
                    expires_in: 3600,
                    user: {
                      id: 1,
                      username: "testuser",
                      email: "test@example.com",
                    },
                  },
                },
              },
              {
                method: "GET",
                path: "/api/auth/verify",
                response: {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                  dynamic: (req: any) => {
                    const authHeader = req.headers.authorization;
                    if (authHeader && authHeader.startsWith("Bearer ")) {
                      return {
                        valid: true,
                        user: {
                          id: 1,
                          username: "testuser",
                          email: "test@example.com",
                        },
                      };
                    }
                    return { valid: false, error: "Invalid token" };
                  },
                },
              },
            ],
            middleware: [{ type: "cors" }, { type: "logging" }],
          },
        },
      ],
      globalConfig: {
        USER_DB_HOST: "${user-db.host}",
        USER_DB_PORT: "${user-db.port}",
        USER_DB_USER: "${user-db.user}",
        USER_DB_PASSWORD: "${user-db.password}",
        USER_DB_NAME: "${user-db.database}",
        AUTH_API_URL: "http://localhost:3001",
      },
    };

    beforeEach(async () => {
      await manager.cleanup();
      await manager.initializeEnvironment(userTestConfig);
    });

    it("должен иметь доступ к базе данных пользователей", () => {
      const dbInfo = manager.getServiceConnectionInfo("user-db");
      expect(dbInfo).toBeDefined();
      expect(dbInfo.database).toBe("user-test");

      expect(process.env.USER_DB_HOST).toBe(dbInfo.host);
      expect(process.env.USER_DB_PORT).toBe(dbInfo.port.toString());
    });

    it("должен иметь доступ к API аутентификации", async () => {
      const apiInfo = manager.getServiceConnectionInfo("auth-api");
      expect(apiInfo).toBeDefined();
      expect(apiInfo.baseUrl).toBe("http://localhost:3001");

      const loginResponse = await fetch(`${apiInfo.baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "testuser",
          password: "password123",
        }),
      });

      expect(loginResponse.status).toBe(200);
      const loginData = await loginResponse.json();
      expect(loginData.token).toBe("mock-jwt-token-12345");
      expect(loginData.user.username).toBe("testuser");
    });

    it("должен проверять токены аутентификации", async () => {
      const apiInfo = manager.getServiceConnectionInfo("auth-api");
      const validResponse = await fetch(`${apiInfo.baseUrl}/api/auth/verify`, {
        headers: { Authorization: "Bearer valid-token" },
      });

      expect(validResponse.status).toBe(200);
      const validData = await validResponse.json();
      expect(validData.valid).toBe(true);
      expect(validData.user.username).toBe("testuser");

      const invalidResponse = await fetch(`${apiInfo.baseUrl}/api/auth/verify`);
      expect(invalidResponse.status).toBe(200);
      const invalidData = await invalidResponse.json();
      expect(invalidData.valid).toBe(false);
    });

    it("должен иметь доступ к информации о сервисах", () => {
      const servicesInfo = manager.getServicesInfo();

      expect(servicesInfo["user-db"]).toBeDefined();
      expect(servicesInfo["user-db"].type).toBe("database");

      expect(servicesInfo["auth-api"]).toBeDefined();
      expect(servicesInfo["auth-api"].type).toBe("http-mock");
    });
  });

  describe("Тест с LDAP сервером", () => {
    const ldapTestConfig: TestEnvironmentConfig = {
      services: [
        {
          name: "ldap-test",
          type: "ldap",
          config: {
            port: 389,
            baseDN: "dc=test,dc=com",
            users: [
              {
                dn: "uid=ldapuser,ou=users,dc=test,dc=com",
                password: "ldappass",
                attributes: {
                  uid: "ldapuser",
                  cn: "LDAP Test User",
                  sn: "Test",
                  mail: "ldapuser@test.com",
                },
              },
            ],
            groups: [
              {
                dn: "cn=testgroup,ou=groups,dc=test,dc=com",
                members: ["uid=ldapuser,ou=users,dc=test,dc=com"],
                attributes: {
                  cn: "testgroup",
                  description: "Test group",
                },
              },
            ],
          },
        },
      ],
      globalConfig: {
        LDAP_URL: "ldap://localhost:389",
        LDAP_BASE_DN: "dc=test,dc=com",
      },
    };

    beforeEach(async () => {
      await manager.cleanup();
      await manager.initializeEnvironment(ldapTestConfig);
    });

    it("должен иметь доступ к LDAP серверу", () => {
      const ldapInfo = manager.getServiceConnectionInfo("ldap-test");
      expect(ldapInfo).toBeDefined();
      expect(ldapInfo.host).toBe("localhost");
      expect(ldapInfo.port).toBe(389);
      expect(ldapInfo.baseDN).toBe("dc=test,dc=com");

      expect(process.env.LDAP_URL).toBe("ldap://localhost:389");
      expect(process.env.LDAP_BASE_DN).toBe("dc=test,dc=com");
    });
  });
});
