import { Injectable } from "@nestjs/common";
import { Pool } from "pg";

@Injectable()
export class UserRepository {
  private pool: Pool;
  constructor() {
    this.pool = new Pool({
      host: process.env.DATABASE_HOST || "localhost",
      port: Number(process.env.DATABASE_PORT) || 5432,
      user: process.env.DATABASE_USER || "postgres",
      password: process.env.DATABASE_PASSWORD || "admin",
      database: process.env.DATABASE_NAME || "lks-test",
    });
  }
  async save(data: { login: string; password: string }) {
    const result = await this.pool.query(
      "INSERT INTO users (login, password) VALUES ($1, $2) ON CONFLICT (login) DO UPDATE SET password = EXCLUDED.password RETURNING id, login, password, created_at",
      [data.login, data.password],
    );
    return result.rows[0];
  }
}
