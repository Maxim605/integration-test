import { TestEnvironmentConfig } from "../setup/types";
import settings from "../setup/settings";
import { startServices, stopServices } from "../setup/services";

let services: Map<string, any>;

beforeAll(async () => {});

afterAll(async () => {
  if (services) await stopServices(services);
});

describe("Тест с базой данных и HTTP Mock", () => {
  const workingConfig: TestEnvironmentConfig = {
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
              ],
            },
          ],
          data: {
            users: [{ username: "testuser", email: "test@example.com" }],
          },
        },
      },
      {
        name: "test-api-simple",
        type: settings.http.type,
        config: {
          port: 3003,
          strictPort: settings.http.strictPort,
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
          ],
        },
      },
    ],
    globalConfig: {
      TEST_DB_HOST: "${test-db.host}",
      TEST_DB_PORT: "${test-db.port}",
      TEST_API_URL: "http://localhost:${test-api-simple.port}",
    },
  };
  beforeEach(async () => {
    if (services) await stopServices(services);
    const started = await startServices(workingConfig);
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
  });
  it("должен иметь доступ к HTTP API", async () => {
    const apiInfo = (services.get("test-api-simple") as any).connectionInfo;
    expect(apiInfo).toBeDefined();
    expect(apiInfo.host).toBe("localhost");
    expect(apiInfo.port).toBe(3003);
    expect(apiInfo.baseUrl).toBe("http://localhost:3003");
    const response = await fetch(`${apiInfo.baseUrl}/api/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.message).toBe("API is working");
  });
  it("должен возвращать пользователя по ID", async () => {
    const apiInfo = (services.get("test-api-simple") as any).connectionInfo;
    const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBe("123");
    expect(user.username).toBe("testuser");
    expect(user.email).toBe("test@example.com");
  });
  it("должен иметь информацию о всех сервисах", () => {
    expect(services.get("test-db")).toBeDefined();
    expect(services.get("test-db").type).toBe("database");
    expect(services.get("test-api-simple")).toBeDefined();
    expect(services.get("test-api-simple").type).toBe("http-mock");
  });
  it("должен корректно очищать ресурсы", async () => {
    const servicesBefore = Array.from(services.keys());
    expect(servicesBefore.length).toBeGreaterThan(0);
    await stopServices(services);
    const servicesAfter = Array.from(services.keys());
    expect(servicesAfter.length).toBe(0);
  });
});
