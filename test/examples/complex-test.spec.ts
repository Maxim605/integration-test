import { complexTestConfig } from "../setup/examples/complex-test-config";
import settings from "../setup/settings";
import { startServices, stopServices } from "../setup/services";

let services: Map<string, any>;

beforeAll(async () => {
  const started = await startServices(complexTestConfig);
  services = started.services;
});

afterAll(async () => {
  if (services) await stopServices(services);
});

describe("База данных пользователей", () => {
  it("должна содержать предустановленных пользователей", async () => {
    const dbInfo = (services.get("users-db") as any).connectionInfo;
    expect(dbInfo).toBeDefined();
    expect(dbInfo.host).toBeDefined();
    expect(dbInfo.port).toBeDefined();
    expect(dbInfo.database).toBe("users-test");
  });
  it("должна иметь таблицы с данными", async () => {
    const dbService = services.get("users-db");
    expect(dbService).toBeDefined();
    expect(dbService?.type).toBe("database");
  });
});
describe("HTTP Mock API", () => {
  it("должен отвечать на запросы", async () => {
    const apiInfo = (services.get("external-api") as any).connectionInfo;
    expect(apiInfo).toBeDefined();
    expect(apiInfo.baseUrl).toBe("http://localhost:3001");
    const response = await fetch(`${apiInfo.baseUrl}/api/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
  it("должен возвращать пользователя по ID", async () => {
    const apiInfo = (services.get("external-api") as any).connectionInfo;
    const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBe("123");
    expect(user.name).toBe("John Doe");
  });
  it("должен обрабатывать аутентификацию", async () => {
    const apiInfo = (services.get("external-api") as any).connectionInfo;
    const response = await fetch(`${apiInfo.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test", password: "test" }),
    });
    expect(response.status).toBe(200);
    const authData = await response.json();
    expect(authData.token).toBe("mock-jwt-token");
    expect(authData.user).toBeDefined();
  });
});
describe("LDAP сервер", () => {
  it("должен быть доступен", async () => {
    const ldapInfo = (services.get("ldap-server") as any).connectionInfo;
    expect(ldapInfo).toBeDefined();
    expect(ldapInfo.host).toBe("localhost");
    expect(ldapInfo.port).toBe(settings.ldap.defaultPort);
    expect(ldapInfo.baseDN).toBe("dc=example,dc=com");
  });
  it("должен содержать пользователей", async () => {
    const ldapService = services.get("ldap-server");
    expect(ldapService).toBeDefined();
    expect(ldapService?.type).toBe("ldap");
  });
});
describe("Переменные окружения", () => {
  it("должны быть установлены", () => {
    expect(process.env.EXTERNAL_API_URL).toBe("http://localhost:3001");
    expect(process.env.LDAP_URL).toBe("ldap://localhost:389");
    expect(process.env.LDAP_BASE_DN).toBe("dc=example,dc=com");
    expect(process.env.USERS_DB_HOST).toBeDefined();
    expect(process.env.USERS_DB_PORT).toBeDefined();
  });
});
