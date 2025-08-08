import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import nock from "nock";
import { Pool } from "pg";
import { createTestPool } from "../setup/db-pool";

describe("E2E тесты аутентификации с моками внешних сервисов", () => {
  let app: INestApplication;
  let dbPool: Pool | null;
  const baseUrl = process.env.MOCK_BASE_URL || "http://localhost:3001";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    dbPool = createTestPool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
    dbPool.on("error", (err: any) => {
      if (err && err.code === "57P01") return;
      console.error("PG Pool error:", err);
    });
  });

  afterAll(async () => {
    await app.close();
    if (dbPool) {
      await dbPool.end();
      dbPool = null;
    }
    nock.cleanAll();
  });

  beforeEach(async () => {
    await dbPool?.query("DELETE FROM users");
    nock.cleanAll();
  });

  describe("Полный сценарий аутентификации", () => {
    it("должен проходить всю цепочку: логин -> внешняя аутентификация -> сохранение -> уведомление", async () => {
      const uniqueLogin = "testuser_" + Date.now();
      const authScope = nock(baseUrl)
        .post("/auth/login", { login: uniqueLogin, password: "42" })
        .reply(200, { success: true });
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({ login: uniqueLogin, password: "42" })
        .expect(201);
      expect(response.body).toEqual({ status: "ok" });
      expect(authScope.isDone()).toBe(true);
      const dbResult = await dbPool?.query(
        "SELECT * FROM users WHERE login = $1 AND password = $2",
        [uniqueLogin, "42"],
      );
      expect(dbResult?.rowCount).toBeGreaterThan(0);
    });

    it("должен корректно обрабатывать неудачную аутентификацию", async () => {
      const uniqueLogin = "failuser_" + Date.now();
      const authScope = nock(baseUrl)
        .post("/auth/login", { login: uniqueLogin, password: "wrongpass" })
        .reply(401, { error: "Invalid credentials" });
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({ login: uniqueLogin, password: "wrongpass" })
        .expect(401);
      expect(authScope.isDone()).toBe(true);
      const dbResult = await dbPool?.query(
        "SELECT * FROM users WHERE login = $1",
        [uniqueLogin],
      );
      expect(dbResult?.rowCount).toBe(0);
    });

    it("должен корректно обрабатывать сбой сервиса уведомлений", async () => {
      const uniqueLogin = "notifuser_" + Date.now();
      const authScope = nock(baseUrl)
        .post("/auth/login", { login: uniqueLogin, password: "42" })
        .reply(200, { success: true });
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({ login: uniqueLogin, password: "42" })
        .expect(201);
      expect(response.body).toEqual({ status: "ok" });
      expect(authScope.isDone()).toBe(true);
      const dbResult = await dbPool?.query(
        "SELECT * FROM users WHERE login = $1",
        [uniqueLogin],
      );
      expect(dbResult?.rowCount).toBeGreaterThan(0);
    });
  });

  describe("Интеграция с внешним сервисом", () => {
    it("должен корректно обрабатывать разные форматы ответа внешнего сервиса", async () => {
      const authScope = nock(baseUrl)
        .post("/auth/login", { login: "formatuser", password: "42" })
        .reply(200, {
          authenticated: true,
          user: { id: 123, name: "Test User" },
          timestamp: new Date().toISOString(),
        });
      const response = await request(app.getHttpServer())
        .post("/login")
        .send({ login: "formatuser", password: "42" })
        .expect(201);
      expect(response.body).toEqual({ status: "ok" });
      expect(authScope.isDone()).toBe(true);
    });
  });

  describe("Консистентность базы данных", () => {
    it("должен обеспечивать консистентность данных при одновременных запросах", async () => {
      const loginData = { login: "test_user", password: "42" };
      const authScope = nock(baseUrl)
        .post("/auth/login", loginData)
        .times(3)
        .reply(200, { success: true });
      const promises = Array(3)
        .fill(null)
        .map(() => request(app.getHttpServer()).post("/login").send(loginData));
      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toEqual({ status: "ok" });
      });
      expect(authScope.isDone()).toBe(true);
      const dbResult = await dbPool?.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult?.rowCount).toBe(1);
    });
  });
});
