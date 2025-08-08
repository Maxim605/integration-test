import { UserRepository } from "../../src/auth/user.repository";
import { Pool } from "pg";

describe("Тесты репозитория пользователей", () => {
  let repository: UserRepository;
  let pool: Pool;

  beforeAll(() => {
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
