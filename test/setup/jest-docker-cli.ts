import { TestEnvironmentConfig } from "./types";
import { startServices } from "./services";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "start":
      try {

        // default configuration
        const config: TestEnvironmentConfig = {
          services: [
            {
              name: "postgres",
              type: "database",
              config: {
                type: "postgres",
                version: "15-alpine",
                user: "postgres",
                password: "admin",
                ...(process.env.EXTRA_SQL_FILES && {
                  initScripts: [
                    ...process.env.EXTRA_SQL_FILES.split(",")
                      .map((f) => f.trim())
                      .filter(Boolean),
                  ],
                }),
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

        const started = await startServices(config);
        const svc = started.services.get("postgres");
        if (!svc) throw new Error("postgres service not started");
        const conn = svc.connectionInfo;
        const outEnv = {
          DATABASE_HOST: String(conn.host),
          DATABASE_PORT: String(conn.port),
          DATABASE_USER: String(conn.user),
          DATABASE_PASSWORD: String(conn.password),
          DATABASE_NAME: String(conn.database),
        };
        const outFile = path.resolve(process.cwd(), "test/.test-env.json");
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, JSON.stringify(outEnv, null, 2), "utf-8");
      } catch (error) {
        console.error("Error starting test environment:", error);
        process.exit(1);
      }
      break;

    case "stop":
      try {
        const outFile = path.resolve(process.cwd(), "test/.test-env.json");
        if (fs.existsSync(outFile)) fs.rmSync(outFile);
      } catch (error) {
        console.error("Error stopping test environment:", error);
        process.exit(1);
      }
      break;

    case "status":
      console.log("Test environment is not running");
      break;

    default:
      break;
  }
}

process.on("SIGINT", async () => {
  process.exit(0);
});

main().catch((error) => {
  console.error("CLI error:", error);
  process.exit(1);
});
