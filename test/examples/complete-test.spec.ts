import { TestEnvironmentConfig } from "../setup/types";
import settings from "../setup/settings";
import { startServices, stopServices } from "../setup/services";

let services: Map<string, any>;

beforeAll(async () => {});

afterAll(async () => {
  if (services) await stopServices(services);
});

describe("PostgreSQL, HTTP Mock, LDAP test", () => {
  const completeConfig: TestEnvironmentConfig = {
    services: [
      {
        name: "test-db",
        type: settings.db.type,
        config: {
          type: settings.db.dbType,
          version: settings.db.version,
          user: settings.db.user,
          password: settings.db.password,
          database: settings.db.database,
          tables: [
            {
              name: "users",
              columns: [
                { name: "id", type: "SERIAL", primaryKey: true },
                { name: "username", type: "VARCHAR(50)", nullable: false },
                { name: "email", type: "VARCHAR(100)", nullable: false },
                {
                  name: "created_at",
                  type: "TIMESTAMP",
                  defaultValue: "CURRENT_TIMESTAMP",
                },
              ],
              indexes: [
                { name: "idx_username", columns: ["username"], unique: true },
              ],
            },
          ],
          data: {
            users: [{ username: "testuser", email: "test@example.com" }],
          },
        },
      },
      {
        name: "test-api",
        type: "http-mock",
        config: {
          port: 3001,
          portRange: { min: 3001, max: 3010 },
          routes: [
            {
              method: "GET",
              path: "/api/health",
              response: {
                status: 200,
                body: { status: "ok", message: "API is working" },
              },
            },
            {
              method: "GET",
              path: "/api/users/:id",
              response: {
                status: 200,
                headers: { "Content-Type": "application/json" },
                dynamic: (req: any) => ({
                  id: req.params.id,
                  username: "testuser",
                  email: "test@example.com",
                }),
              },
            },
            {
              method: "POST",
              path: "/api/auth/login",
              response: {
                status: 200,
                headers: { "Content-Type": "application/json" },
                body: {
                  token: "mock-jwt-token",
                  expires_in: 3600,
                  user: {
                    id: 1,
                    username: "testuser",
                    email: "test@example.com",
                  },
                },
              },
            },
          ],
          middleware: [{ type: "cors" }, { type: "logging" }],
        },
      },
      {
        name: "test-ldap-complete",
        type: "ldap",
        config: {
          port: settings.ldap.defaultPort,
          baseDN: "dc=test,dc=com",
          users: [
            {
              dn: "uid=testuser,ou=users,dc=test,dc=com",
              password: "testpass",
              attributes: {
                uid: "testuser",
                cn: "Test User",
                sn: "User",
                mail: "testuser@test.com",
              },
            },
          ],
          groups: [
            {
              dn: "cn=testgroup,ou=groups,dc=test,dc=com",
              members: ["uid=testuser,ou=users,dc=test,dc=com"],
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
      TEST_DB_HOST: "${test-db.host}",
      TEST_DB_PORT: "${test-db.port}",
      TEST_DB_USER: "${test-db.user}",
      TEST_DB_PASSWORD: "${test-db.password}",
      TEST_DB_NAME: "${test-db.database}",
      TEST_API_URL: "http://localhost:${test-api.port}",
      TEST_LDAP_URL: "ldap://localhost:${settings.ldap.defaultPort}",
      TEST_LDAP_BASE_DN: "dc=test,dc=com",
    },
  };
  beforeEach(async () => {
    if (services) await stopServices(services);
    const started = await startServices(completeConfig);
    services = started.services;
  });
  it("должен иметь доступ к базе данных", () => {
    const dbInfo = (services.get("test-db") as any).connectionInfo;
    expect(dbInfo).toBeDefined();
    expect(dbInfo.host).toBeDefined();
    expect(dbInfo.port).toBeDefined();
    expect(dbInfo.database).toBe("test-db");
    expect(process.env.TEST_DB_HOST).toBe(dbInfo.host);
    expect(process.env.TEST_DB_PORT).toBe(dbInfo.port.toString());
    expect(process.env.TEST_DB_USER).toBe(settings.db.user);
    expect(process.env.TEST_DB_PASSWORD).toBe(settings.db.password);
  });
  it("должен иметь доступ к HTTP API", async () => {
    const apiInfo = (services.get("test-api") as any).connectionInfo;
    expect(apiInfo).toBeDefined();
    expect(apiInfo.host).toBe("localhost");
    expect(apiInfo.port).toBeGreaterThanOrEqual(3001);
    expect(apiInfo.port).toBeLessThanOrEqual(3010);
    expect(apiInfo.baseUrl).toBe(`http://localhost:${apiInfo.port}`);
    const healthResponse = await fetch(`${apiInfo.baseUrl}/api/health`);
    expect(healthResponse.status).toBe(200);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe("ok");
    expect(healthData.message).toBe("API is working");
    const userResponse = await fetch(`${apiInfo.baseUrl}/api/users/123`);
    expect(userResponse.status).toBe(200);
    const userData = await userResponse.json();
    expect(userData.id).toBe("123");
    expect(userData.username).toBe("testuser");
    expect(userData.email).toBe("test@example.com");
    const authResponse = await fetch(`${apiInfo.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testuser",
        password: "password123",
      }),
    });
    expect(authResponse.status).toBe(200);
    const authData = await authResponse.json();
    expect(authData.token).toBe("mock-jwt-token");
    expect(authData.user.username).toBe("testuser");
  });
  it("должен иметь доступ к LDAP серверу", () => {
    const ldapInfo = (services.get("test-ldap-complete") as any).connectionInfo;
    expect(ldapInfo).toBeDefined();
    expect(ldapInfo.host).toBe("localhost");
    expect(ldapInfo.port).toBe(settings.ldap.defaultPort);
    expect(ldapInfo.baseDN).toBe("dc=test,dc=com");
    expect(ldapInfo.url).toBe("ldap://localhost:389");
    expect(process.env.TEST_LDAP_URL).toBe("ldap://localhost:389");
    expect(process.env.TEST_LDAP_BASE_DN).toBe("dc=test,dc=com");
  });
  it("должен иметь информацию о всех сервисах", () => {
    expect(services.get("test-db")).toBeDefined();
    expect(services.get("test-db").type).toBe("database");
    expect(services.get("test-api")).toBeDefined();
    expect(services.get("test-api").type).toBe("http-mock");
    expect(services.get("test-ldap-complete")).toBeDefined();
    expect(services.get("test-ldap-complete").type).toBe("ldap");
  });
  it("должен корректно очищать ресурсы", async () => {
    const servicesBefore = Array.from(services.keys());
    expect(servicesBefore.length).toBeGreaterThan(0);
    await stopServices(services);
    const servicesAfter = Array.from(services.keys());
    expect(servicesAfter.length).toBe(0);
  });
});
