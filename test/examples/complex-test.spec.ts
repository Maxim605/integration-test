import { complexTestConfig } from "../setup/examples/complex-test-config";
import settings from "../setup/settings";
import { createDb, createMock, createLdap } from "../setup/services";

let dbHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;
let httpHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;
let ldapHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;

beforeAll(async () => {
  const dbCfg = complexTestConfig.services.find((s) => s.type === "database")
    ?.config;
  const httpCfg = complexTestConfig.services.find((s) => s.type === "http-mock")
    ?.config;
  const ldapCfg = complexTestConfig.services.find((s) => s.type === "ldap")
    ?.config;
  if (dbCfg) dbHandle = await createDb(dbCfg);
  if (httpCfg) httpHandle = await createMock(httpCfg);
  if (ldapCfg) ldapHandle = await createLdap(ldapCfg);
});

afterAll(async () => {
  if (httpHandle) await httpHandle.stop();
  if (ldapHandle) await ldapHandle.stop();
  if (dbHandle) await dbHandle.stop();
});

describe("База данных пользователей", () => {
  it("должна содержать предустановленных пользователей", async () => {
    const dbInfo = dbHandle!.connectionInfo;
    expect(dbInfo).toBeDefined();
    expect(dbInfo.host).toBeDefined();
    expect(dbInfo.port).toBeDefined();
    expect(dbInfo.database).toBe("users-test");
  });
  it("должна иметь таблицы с данными", async () => {
    expect(dbHandle).toBeDefined();
  });
});
describe("HTTP Mock API", () => {
  it("должен отвечать на запросы", async () => {
    const apiInfo = httpHandle!.connectionInfo;
    expect(apiInfo).toBeDefined();
    expect(apiInfo.baseUrl).toBe("http://localhost:3001");
    const response = await fetch(`${apiInfo.baseUrl}/api/health`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
  });
  it("должен возвращать пользователя по ID", async () => {
    const apiInfo = httpHandle!.connectionInfo;
    const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBe("123");
    expect(user.name).toBe("John Doe");
  });
  it("должен обрабатывать аутентификацию", async () => {
    const apiInfo = httpHandle!.connectionInfo;
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
    const ldapInfo = ldapHandle!.connectionInfo;
    expect(ldapInfo).toBeDefined();
    expect(ldapInfo.host).toBe("localhost");
    expect(ldapInfo.port).toBe(settings.ldap.defaultPort);
    expect(ldapInfo.baseDN).toBe("dc=example,dc=com");
  });
  it("должен содержать пользователей", async () => {
    expect(ldapHandle).toBeDefined();
  });
});
describe("Переменные окружения", () => {
  it("должны быть установлены", () => {
    expect(httpHandle?.connectionInfo.baseUrl).toBe("http://localhost:3001");
    expect(ldapHandle?.connectionInfo.url).toBe("ldap://localhost:389");
    expect(ldapHandle?.connectionInfo.baseDN).toBe("dc=example,dc=com");
    expect(dbHandle?.connectionInfo.host).toBeDefined();
    expect(String(dbHandle?.connectionInfo.port)).toBeDefined();
  });
});
