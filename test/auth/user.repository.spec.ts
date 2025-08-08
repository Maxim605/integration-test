import { UserRepository } from "../../src/auth/user.repository";
import { Pool } from "pg";
import { startServices, stopServices } from "../setup/services";
import { TestEnvironmentConfig } from "../setup/types";

describe("Тесты репозитория пользователей", () => {
  let repository: UserRepository;
  let pool: Pool;

  beforeAll(async () => {
    const env: TestEnvironmentConfig = {
      services: [
        {
          name: "postgres",
          type: "database",
          config: {
            type: "postgres",
            version: "15-alpine",
            user: "postgres",
            password: "admin",
            database: "test-db",
            initScripts: ["test/init-db.sql"],
          },
        },
      ],
      globalConfig: {
        DATABASE_HOST: "${postgres.host}",
        DATABASE_PORT: "${postgres.port}",
        DATABASE_USER: "${postgres.user}",
        DATABASE_PASSWORD: "${postgres.password}",
        DATABASE_NAME: "${postgres.database}",
      },
    };
    await startServices(env);
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
    await stopServices(new Map());
  });

  it("должен сохранять пользователя", async () => {
    const user = await repository.save({ login: "test", password: "42" });
    expect(user.login).toBe("test");
    expect(user.password).toBe("42");
  });
});
