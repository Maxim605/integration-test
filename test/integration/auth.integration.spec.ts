import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { Pool } from "pg";
import { createTestPool } from "../setup/db-pool";
import { createDb, createMock } from "../setup/services";
import { DatabaseConfig, HttpMockConfig } from "../setup/types";

const dbConfig: DatabaseConfig = {
  type: "postgres",
  version: "15-alpine",
  user: "postgres",
  password: "admin",
  database: "test_db",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "SERIAL", primaryKey: true },
        {
          name: "login",
          type: "VARCHAR(255)",
          nullable: false,
          unique: true,
        },
        { name: "password", type: "VARCHAR(255)", nullable: false },
        {
          name: "created_at",
          type: "TIMESTAMP",
          defaultValue: "CURRENT_TIMESTAMP",
        },
      ],
      indexes: [{ name: "idx_login", columns: ["login"], unique: true }],
    },
  ],
  data: {
    users: [{ login: "122", password: "122" }],
  },
};

const mockConfig: HttpMockConfig = {
  port: 3001,
  routes: [
    {
      method: "POST",
      path: "/auth/login",
      response: {
        status: 200,
        body: {
          status: "ok",
        },
      },
    },
  ],
  middleware: [{ type: "cors" }, { type: "logging" }],
};

describe("Интеграционные тесты аутентификации", () => {
  let app: INestApplication;
  let dbPool: Pool;
  let dbHandle: { connectionInfo: any; stop: () => Promise<void> };
  let mockHandle: { connectionInfo: any; stop: () => Promise<void> };

  beforeAll(async () => {
    dbHandle = await createDb(dbConfig);
    const dbInfo = dbHandle.connectionInfo;
    process.env.DATABASE_HOST = dbInfo.host;
    process.env.DATABASE_PORT = String(dbInfo.port);
    process.env.DATABASE_USER = dbInfo.user;
    process.env.DATABASE_PASSWORD = dbInfo.password;
    process.env.DATABASE_NAME = dbInfo.database;

    mockHandle = await createMock(mockConfig);
    process.env.MOCK_BASE_URL = mockHandle.connectionInfo.baseUrl;

    const { AppModule } = await import("../../src/app.module");
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    dbPool = createTestPool(dbInfo);
  });

  afterAll(async () => {
    await app.close();
    await dbPool.end();
    if (mockHandle) await mockHandle.stop();
    if (dbHandle) await dbHandle.stop();
  });

  beforeEach(async () => {
    await dbPool.query("DELETE FROM users");
  });

  describe("POST /login", () => {
    it("должен успешно создавать пользователя и возвращать статус ok", async () => {
      const loginData = { login: "testuser", password: "42" };
      const response = await request(app.getHttpServer())
        .post("/login")
        .send(loginData)
        .expect(201);
      expect(response.body).toEqual({ status: "ok" });
      const dbResult = await dbPool.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].login).toBe(loginData.login);
      expect(dbResult.rows[0].password).toBe(loginData.password);
    });

    it("должен корректно обрабатывать дублирующийся логин", async () => {
      const loginData = { login: "testuser", password: "42" };
      await request(app.getHttpServer())
        .post("/login")
        .send(loginData)
        .expect(201);
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({ ...loginData, password: "42" })
        .expect(201);
      expect(response.body).toEqual({ status: "ok" });
      const dbResult = await dbPool.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].password).toBe("42");
    });

    it("должен валидировать обязательные поля", async () => {
      const invalidData = { login: "", password: "" };
      const response = await request(app.getHttpServer())
        .post("/login")
        .send(invalidData)
        .expect(400);
      expect(response.body.message).toContain("login should not be empty");
      expect(response.body.message).toContain("password should not be empty");
    });

    it("должен обрабатывать отсутствие полей", async () => {
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({})
        .expect(400);
      expect(response.body.message).toContain("login should not be empty");
      expect(response.body.message).toContain("password should not be empty");
    });

    it("должен обрабатывать некорректный JSON", async () => {
      const response = await request(app.getHttpServer())
        .post("/login")
        .send("invalid json")
        .set("Content-Type", "application/json")
        .expect(400);
      expect(response.body.message).toBeDefined();
    });
  });

  describe("Операции с базой данных", () => {
    it("должен создавать таблицу users с корректной схемой", async () => {
      const result = await dbPool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
      );
      const columns = result.rows.map((r) => r.column_name);
      expect(columns).toEqual(
        expect.arrayContaining(["id", "login", "password", "created_at"]),
      );
    });

    it("должен обрабатывать одновременное создание пользователей", async () => {
      const loginData = { login: "testuser", password: "42" };
      const promises = Array(5)
        .fill(null)
        .map(() => request(app.getHttpServer()).post("/login").send(loginData));
      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toEqual({ status: "ok" });
      });
      const dbResult = await dbPool.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult.rows).toHaveLength(1);
    });
  });
});
