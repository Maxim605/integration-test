import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { Pool } from "pg";
import { createTestPool } from "../setup/db-pool";

describe("Интеграционные тесты аутентификации", () => {
  let app: INestApplication;
  let dbPool: Pool;

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
  });

  afterAll(async () => {
    await app.close();
    await dbPool.end();
  });

  describe("POST /login", () => {
    it("должен находить дефолтного пользователя", async () => {
      const loginData = { login: "defaultuser", password: "100" };
      const dbResult = await dbPool.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].login).toBe(loginData.login);
      expect(dbResult.rows[0].password).toBe(loginData.password);
    });
  });

  describe("POST /login", () => {
    it("должен находить пользователя из sql", async () => {
      const loginData = { login: "sqluser", password: "42" };
      const dbResult = await dbPool.query(
        "SELECT * FROM users WHERE login = $1",
        [loginData.login],
      );
      expect(dbResult.rows).toHaveLength(1);
      expect(dbResult.rows[0].login).toBe(loginData.login);
      expect(dbResult.rows[0].password).toBe(loginData.password);
    });
  });
});
