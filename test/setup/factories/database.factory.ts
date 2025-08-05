import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import {
  ServiceFactory,
  ServiceInstance,
  DatabaseConfig,
  TableConfig,
} from "../types";
import { createTestPool } from "../db-pool";

export class DatabaseServiceInstance implements ServiceInstance {
  private container: StartedTestContainer | null = null;
  private connectionInfo: any = null;

  constructor(
    public name: string,
    public type: string,
    public config: DatabaseConfig,
  ) {}

  async start(): Promise<void> {
    const image = this.getImageName();
    const env = this.getEnvironmentVariables();

    this.container = await new GenericContainer(image)
      .withEnvironment(env)
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage(
          "database system is ready to accept connections",
        ).withStartupTimeout(60000),
      )
      .start();

    const port = this.container.getMappedPort(5432);
    const host = this.container.getHost();

    this.connectionInfo = {
      host: String(host),
      port: String(port),
      user: String(this.config.user || "postgres"),
      password: String(this.config.password || "admin"),
      database: String(this.config.database || "test-db"),
    };

    console.log(`db ${this.name} started on ${host}:${port}`);
    await this.initializeDatabase();
  }

  async stop(): Promise<void> {
    if (this.container) {
      await this.container.stop();
      this.container = null;
    }
  }

  getConnectionInfo(): any {
    return this.connectionInfo;
  }

  private getImageName(): string {
    const type = this.config.type || "postgres";
    const version = this.config.version || "15-alpine";

    const imageMap: Record<string, string> = {
      postgres: "postgres",
      mysql: "mysql",
      database: "postgres",
    };

    const imageName = imageMap[type] || "postgres";
    return `${imageName}:${version}`;
  }

  private getEnvironmentVariables(): Record<string, string> {
    const env: Record<string, string> = {};

    const dbType = (
      this.config.type === "database" ? "postgres" : this.config.type
    ) as "postgres" | "mysql";

    switch (dbType) {
      case "postgres":
        env.POSTGRES_USER = this.config.user || "postgres";
        env.POSTGRES_PASSWORD = this.config.password || "admin";
        env.POSTGRES_DB = this.config.database || "test-db";
        break;
      case "mysql":
        env.MYSQL_ROOT_PASSWORD = this.config.password || "admin";
        env.MYSQL_DATABASE = this.config.database || "test-db";
        env.MYSQL_USER = this.config.user || "test";
        env.MYSQL_PASSWORD = this.config.password || "test";
        break;
      default:
        env.POSTGRES_USER = this.config.user || "postgres";
        env.POSTGRES_PASSWORD = this.config.password || "admin";
        env.POSTGRES_DB = this.config.database || "test-db";
        break;
    }

    return env;
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.connectionInfo) {
      throw new Error("Database not started");
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const pool = createTestPool({
      ...this.connectionInfo,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 1,
    });

    try {
      await pool.query("SELECT 1");

      if (this.config.initScripts) {
        for (const script of this.config.initScripts) {
          const fs = require("fs");
          const path = require("path");
          const resolvedPath = path.resolve(process.cwd(), script);
          const sql = fs.readFileSync(resolvedPath, "utf8");
          await pool.query(sql);
        }
      }

      if (this.config.tables) {
        await this.createTables(pool);
      }

      if (this.config.data) {
        await this.insertData(pool);
      }

      console.log(`Database ${this.name} initialized`);
    } catch (error) {
      console.error(`Error initializing database ${this.name}:`, error);
      throw error;
    } finally {
      await pool.end();
    }
  }

  private async createTables(pool: any): Promise<void> {
    for (const table of this.config.tables!) {
      const createTableSQL = this.generateCreateTableSQL(table);
      await pool.query(createTableSQL);

      if (table.indexes) {
        for (const index of table.indexes) {
          const createIndexSQL = this.generateCreateIndexSQL(table.name, index);
          await pool.query(createIndexSQL);
        }
      }
    }
  }

  private generateCreateTableSQL(table: TableConfig): string {
    const columns = table.columns
      .map((col) => {
        let columnDef = `${col.name} ${col.type}`;

        if (!col.nullable) {
          columnDef += " NOT NULL";
        }

        if (col.primaryKey) {
          columnDef += " PRIMARY KEY";
        }

        if (col.autoIncrement) {
          if (col.type.toUpperCase().includes("SERIAL")) {
            columnDef = `${col.name} ${col.type}`;
          } else {
            columnDef = `${col.name} SERIAL`;
          }
        } else {
          if (!col.nullable) {
            columnDef += " NOT NULL";
          }

          if (col.primaryKey) {
            columnDef += " PRIMARY KEY";
          }

        if (col.unique) {
          columnDef += " UNIQUE";
        }

        if (col.defaultValue !== undefined) {
          columnDef += ` DEFAULT ${col.defaultValue}`;
        }

        return columnDef;
      })
      .join(", ");

    return `CREATE TABLE IF NOT EXISTS ${table.name} (${columns})`;
  }

  private generateCreateIndexSQL(tableName: string, index: any): string {
    const unique = index.unique ? "UNIQUE " : "";
    const columns = index.columns.join(", ");
    return `CREATE ${unique}INDEX ${index.name} ON ${tableName} (${columns})`;
  }

  private async insertData(pool: any): Promise<void> {
    for (const [tableName, rows] of Object.entries(this.config.data!)) {
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const insertSQL = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
        await pool.query(insertSQL, values);
      }
    }
  }
}

export class DatabaseFactory implements ServiceFactory {
  async createService(serviceConfig: any): Promise<ServiceInstance> {
    return new DatabaseServiceInstance(
      serviceConfig.name,
      "database",
      serviceConfig.config,
    );
  }

  supports(type: string): boolean {
    return type === "database";
  }
}
