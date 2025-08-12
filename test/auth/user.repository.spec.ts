import { UserRepository } from "../../src/auth/user.repository";
import { Pool } from "pg";
import { createDb } from "../setup/services";
import { DatabaseConfig } from "../setup/types";

describe("Тесты репозитория пользователей", () => {
  let repository: UserRepository;
  let pool: Pool;

  beforeAll(async () => {
    const cfg: DatabaseConfig = {
      type: "postgres",
      version: "15-alpine",
      user: "postgres",
      password: "admin",
      database: "test-db",
      initScripts: ["test/init-db.sql"],
    };
    const db = await createDb(cfg);
    process.env.DATABASE_HOST = db.connectionInfo.host;
    process.env.DATABASE_PORT = String(db.connectionInfo.port);
    process.env.DATABASE_USER = db.connectionInfo.user;
    process.env.DATABASE_PASSWORD = db.connectionInfo.password;
    process.env.DATABASE_NAME = db.connectionInfo.database;
    pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT),
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
    repository = new UserRepository();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("должен сохранять пользователя", async () => {
    const user = await repository.save({ login: "test", password: "42" });
    expect(user.login).toBe("test");
    expect(user.password).toBe("42");
  });
});
