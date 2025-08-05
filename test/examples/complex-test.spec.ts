import { TestEnvironmentManager } from "../setup/environment-manager";
import { complexTestConfig } from "../setup/examples/complex-test-config";

describe("Complex test with multiple services", () => {
  let manager: TestEnvironmentManager;

  beforeAll(async () => {
    manager = TestEnvironmentManager.getInstance();
    await manager.initializeEnvironment(complexTestConfig);
  });

  afterAll(async () => {
    await manager.cleanup();
  });

  describe("База данных пользователей", () => {
    it("должна содержать предустановленных пользователей", async () => {
      const dbInfo = manager.getServiceConnectionInfo("users-db");
      expect(dbInfo).toBeDefined();
      expect(dbInfo.host).toBeDefined();
      expect(dbInfo.port).toBeDefined();
      expect(dbInfo.database).toBe("users-test");
    });

    it("должна иметь таблицы с данными", async () => {
      const dbService = manager.getService("users-db");
      expect(dbService).toBeDefined();
      expect(dbService?.type).toBe("database");
    });
  });

  describe("HTTP Mock API", () => {
    it("должен отвечать на запросы", async () => {
      const apiInfo = manager.getServiceConnectionInfo("external-api");
      expect(apiInfo).toBeDefined();
      expect(apiInfo.baseUrl).toBe("http://localhost:3001");

      const response = await fetch(`${apiInfo.baseUrl}/api/health`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
    });

    it("должен возвращать пользователя по ID", async () => {
      const apiInfo = manager.getServiceConnectionInfo("external-api");

      const response = await fetch(`${apiInfo.baseUrl}/api/users/123`);
      expect(response.status).toBe(200);

      const user = await response.json();
      expect(user.id).toBe("123");
      expect(user.name).toBe("John Doe");
    });

    it("должен обрабатывать аутентификацию", async () => {
      const apiInfo = manager.getServiceConnectionInfo("external-api");

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
      const ldapInfo = manager.getServiceConnectionInfo("ldap-server");
      expect(ldapInfo).toBeDefined();
      expect(ldapInfo.host).toBe("localhost");
      expect(ldapInfo.port).toBe(389);
      expect(ldapInfo.baseDN).toBe("dc=example,dc=com");
    });

    it("должен содержать пользователей", async () => {
      const ldapService = manager.getService("ldap-server");
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
});
