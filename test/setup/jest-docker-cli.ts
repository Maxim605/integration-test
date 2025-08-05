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
                database: "lks-test",
                // initScripts: ['test/init-db.sql'],
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
        };

        await manager.initializeEnvironment(config);

        const servicesInfo = manager.getServicesInfo();
        console.log("Running services:");
        for (const [name, info] of Object.entries(servicesInfo)) {
          console.log(
            `  ${name} (${info.type}): ${JSON.stringify(info.connectionInfo)}`,
          );
        }
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

        if (Object.keys(servicesInfo).length === 0) {
          console.log("Test environment is not running");
        } else {
          console.log("Running services:");
          for (const [name, info] of Object.entries(servicesInfo)) {
            console.log(
              `  ${name} (${info.type}): ${JSON.stringify(info.connectionInfo)}`,
            );
          }
        }
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
