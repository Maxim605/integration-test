import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { createTestPool } from "./db-pool";

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class TestContainerSetup {
  private static container: StartedTestContainer | null = null;
  private static databaseConfig: DatabaseConfig | null = null;

  static async startDatabase(
    extraSqlFiles?: string[],
  ): Promise<DatabaseConfig> {
    if (this.container && this.databaseConfig) {
      return this.databaseConfig;
    }

    this.container = await new GenericContainer("postgres:15-alpine")
      .withEnvironment({
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: "admin",
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(
          "database system is ready to accept connections",
        ).withStartupTimeout(60000),
      )
      .start();

    const port = this.container.getMappedPort(5432);
    const host = this.container.getHost();

    this.databaseConfig = {
      host,
      port,
      user: "postgres",
      password: "admin",
      database: "lks-test",
    };

    await this.initializeDatabase(extraSqlFiles);
    return this.databaseConfig;
  }

  static async stopDatabase(): Promise<void> {
    if (this.container) {
      await this.container.stop();
      this.container = null;
    }
  }

  private static async initializeDatabase(
    extraSqlFiles?: string[],
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const pool = createTestPool({
      ...this.databaseConfig,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1,
    });
    try {
      await pool.query("SELECT 1");
      const fs = require("fs");
      const path = require("path");
      const initScript = fs.readFileSync(
        path.resolve(process.cwd(), "test/init-db.sql"),
        "utf8",
      );
      await pool.query(initScript);
      if (extraSqlFiles && Array.isArray(extraSqlFiles)) {
        for (const file of extraSqlFiles) {
          const fs = require("fs");
          const path = require("path");
          const resolvedPath = path.resolve(process.cwd(), file);
          const sql = fs.readFileSync(resolvedPath, "utf8");
          await pool.query(sql);
        }
      }
    } catch (error) {
      console.error("Init error:", error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  static getDatabaseConfig(): DatabaseConfig {
    if (!this.databaseConfig) {
      throw new Error("База данных не запущена");
    }
    return this.databaseConfig;
  }
}
