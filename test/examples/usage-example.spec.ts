import settings from "../setup/settings";
import { TestEnvironmentConfig } from "../setup/types";
import {
  startServices,
  stopServices,
  TestDB,
  HttpMockServer,
} from "../setup/services";

let services: Map<string, any>;
let dbs: Map<string, TestDB>;
let https: Map<string, HttpMockServer>;
let ldaps: Map<string, any>;

beforeAll(async () => {});

afterAll(async () => {
  if (services) await stopServices(services);
});

describe("Тест с пользователями и аутентификацией", () => {
  const userTestConfig: TestEnvironmentConfig = {
    services: [
      {
        name: "user-db",
        type: settings.db.type,
        config: {
          type: settings.db.type,
          version: settings.db.version,
          user: settings.db.user,
          password: settings.db.password,
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
        type: settings.http.type,
        config: {
          port: 3002,
          strictPort: settings.http.strictPort,
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
      AUTH_API_URL: "http://localhost:3002",
    },
  };
  beforeEach(async () => {
    if (services) await stopServices(services);
    const started = await startServices(userTestConfig);
    services = started.services;
    dbs = started.dbs;
    https = started.https;
  });
  it("должен иметь доступ к базе данных пользователей", () => {
    const db = dbs.get("user-db");
    expect(db).toBeDefined();
    const dbInfo = (services.get("user-db") as any).connectionInfo;
    expect(dbInfo.database).toBe("user-test");
    expect(process.env.USER_DB_HOST).toBe(dbInfo.host);
    expect(process.env.USER_DB_PORT).toBe(String(dbInfo.port));
  });
  it("должен иметь доступ к API аутентификации", async () => {
    const apiInfo = (services.get("auth-api") as any).connectionInfo;
    expect(apiInfo).toBeDefined();
    expect(apiInfo.baseUrl).toBe("http://localhost:3002");
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
    const apiInfo = (services.get("auth-api") as any).connectionInfo;
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
    expect(services.get("user-db")).toBeDefined();
    expect(services.get("user-db").type).toBe("database");
    expect(services.get("auth-api")).toBeDefined();
    expect(services.get("auth-api").type).toBe("http-mock");
  });
});
describe("Тест с LDAP сервером", () => {
  const ldapTestConfig: TestEnvironmentConfig = {
    services: [
      {
        name: "ldap-test",
        type: "ldap",
        config: {
          port: settings.ldap.defaultPort,
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
      LDAP_URL: "ldap://localhost:${settings.ldap.defaultPort}",
      LDAP_BASE_DN: "dc=test,dc=com",
    },
  };
  beforeEach(async () => {
    if (services) await stopServices(services);
    const started = await startServices(ldapTestConfig);
    services = started.services;
    ldaps = (started as any).ldaps;
  });
  it("должен иметь доступ к LDAP серверу", () => {
    const ldapInfo = (services.get("ldap-test") as any).connectionInfo;
    expect(ldapInfo).toBeDefined();
    expect(ldapInfo.host).toBe("localhost");
    expect(ldapInfo.port).toBe(settings.ldap.defaultPort);
    expect(ldapInfo.baseDN).toBe("dc=test,dc=com");
    expect(process.env.LDAP_URL).toBe("ldap://localhost:389");
    expect(process.env.LDAP_BASE_DN).toBe("dc=test,dc=com");
  });
});
