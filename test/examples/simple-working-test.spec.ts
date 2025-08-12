import settings from "../setup/settings";
import { createDb, createMock } from "../setup/services";
import { DatabaseConfig, HttpMockConfig } from "../setup/types";

let dbHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;
let httpHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;

beforeAll(async () => {});

afterAll(async () => {
  if (httpHandle) await httpHandle.stop();
  if (dbHandle) await dbHandle.stop();
});

describe("Тест с базой данных и HTTP Mock", () => {
  const dbCfg: DatabaseConfig = {
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
  };
  const httpCfg: HttpMockConfig = {
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
  };
  beforeEach(async () => {
    if (httpHandle) await httpHandle.stop();
    if (dbHandle) await dbHandle.stop();
    dbHandle = await createDb(dbCfg);
    httpHandle = await createMock(httpCfg);
    process.env.TEST_DB_HOST = dbHandle.connectionInfo.host;
    process.env.TEST_DB_PORT = String(dbHandle.connectionInfo.port);
    process.env.TEST_API_URL = httpHandle.connectionInfo.baseUrl;
  });
  it("должен иметь доступ к базе данных", () => {
    const dbInfo = dbHandle!.connectionInfo;
    expect(dbInfo).toBeDefined();
    expect(dbInfo.host).toBeDefined();
    expect(dbInfo.port).toBeDefined();
    expect(dbInfo.database).toBe("test-db");
    expect(process.env.TEST_DB_HOST).toBe(dbInfo.host);
    expect(process.env.TEST_DB_PORT).toBe(dbInfo.port.toString());
  });
  it("должен иметь доступ к HTTP API", async () => {
    const apiInfo = httpHandle!.connectionInfo;
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
    const apiInfo = httpHandle!.connectionInfo;
    const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBe("123");
    expect(user.username).toBe("testuser");
    expect(user.email).toBe("test@example.com");
  });
  it("должен иметь информацию о сервисах (через хэндлы)", () => {
    expect(dbHandle).toBeDefined();
    expect(httpHandle).toBeDefined();
  });
  it("должен корректно очищать ресурсы", async () => {
    await httpHandle!.stop();
    await dbHandle!.stop();
    expect(true).toBe(true);
  });
});
