import settings from "../setup/settings";
import { createDb, createMock, createLdap } from "../setup/services";
import { DatabaseConfig, HttpMockConfig, LdapConfig } from "../setup/types";

let dbHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;
let httpHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;
let ldapHandle: { connectionInfo: any; stop: () => Promise<void> } | null = null;

beforeAll(async () => {});

afterAll(async () => {
  if (httpHandle) await httpHandle.stop();
  if (ldapHandle) await ldapHandle.stop();
  if (dbHandle) await dbHandle.stop();
});

describe("PostgreSQL, HTTP Mock, LDAP test", () => {
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
  };

  const httpCfg: HttpMockConfig = {
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
  };

  const ldapCfg: LdapConfig = {
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
  };

  beforeEach(async () => {
    if (httpHandle) await httpHandle.stop();
    if (ldapHandle) await ldapHandle.stop();
    if (dbHandle) await dbHandle.stop();
    dbHandle = await createDb(dbCfg);
    httpHandle = await createMock(httpCfg);
    ldapHandle = await createLdap(ldapCfg);
    process.env.TEST_DB_HOST = dbHandle.connectionInfo.host;
    process.env.TEST_DB_PORT = String(dbHandle.connectionInfo.port);
    process.env.TEST_DB_USER = dbHandle.connectionInfo.user;
    process.env.TEST_DB_PASSWORD = dbHandle.connectionInfo.password;
    process.env.TEST_DB_NAME = dbHandle.connectionInfo.database;
    process.env.TEST_API_URL = httpHandle.connectionInfo.baseUrl;
    process.env.TEST_LDAP_URL = ldapHandle.connectionInfo.url;
    process.env.TEST_LDAP_BASE_DN = ldapHandle.connectionInfo.baseDN;
  });
  it("должен иметь доступ к базе данных", () => {
    const dbInfo = dbHandle!.connectionInfo;
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
    const apiInfo = httpHandle!.connectionInfo;
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
    const ldapInfo = ldapHandle!.connectionInfo;
    expect(ldapInfo).toBeDefined();
    expect(ldapInfo.host).toBe("localhost");
    expect(ldapInfo.port).toBe(settings.ldap.defaultPort);
    expect(ldapInfo.baseDN).toBe("dc=test,dc=com");
    expect(ldapInfo.url).toBe("ldap://localhost:389");
    expect(process.env.TEST_LDAP_URL).toBe("ldap://localhost:389");
    expect(process.env.TEST_LDAP_BASE_DN).toBe("dc=test,dc=com");
  });
  it("должен корректно очищать ресурсы", async () => {
    await httpHandle!.stop();
    await ldapHandle!.stop();
    await dbHandle!.stop();
    // If we reached here without errors, resources were cleaned
    expect(true).toBe(true);
  });
});
