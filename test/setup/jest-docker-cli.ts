import { TestEnvironmentManager } from "./environment-manager";
import { TestEnvironmentConfig } from "./types";

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "start":
      try {
        const manager = TestEnvironmentManager.getInstance();

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

        await manager.initializeEnvironment(config);

        const fs = require("fs");
        const path = require("path");
        const conn = manager.getServiceConnectionInfo("postgres");
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
        const manager = TestEnvironmentManager.getInstance();
        await manager.cleanup();
      } catch (error) {
        console.error("Error stopping test environment:", error);
        process.exit(1);
      }
      break;

    case "status":
      try {
        const manager = TestEnvironmentManager.getInstance();
        const servicesInfo = manager.getServicesInfo();
      } catch (error) {
        console.log("Test environment is not running");
      }
      break;

    default:
      break;
  }
}

process.on("SIGINT", async () => {
  const manager = TestEnvironmentManager.getInstance();
  await manager.cleanup();
  process.exit(0);
});

main().catch((error) => {
  console.error("CLI error:", error);
  process.exit(1);
});
