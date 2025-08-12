import { DatabaseConfig } from "./types";
import { createDb } from "./services";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "start":
      try {

        const cfg: DatabaseConfig = {
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
        } as DatabaseConfig;
        const db = await createDb(cfg);
        const conn = db.connectionInfo;
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
