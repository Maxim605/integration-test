import { Pool, PoolClient, PoolConfig } from "pg";

export function createTestPool(config: PoolConfig): Pool {
  const safeConfig: PoolConfig = {
    ...config,
    host: config.host !== undefined ? String(config.host) : undefined,
    port: config.port !== undefined ? Number(config.port) : undefined,
    user: config.user !== undefined ? String(config.user) : undefined,
    password:
      config.password !== undefined ? String(config.password) : undefined,
    database:
      config.database !== undefined ? String(config.database) : undefined,
  };
  const pool = new Pool(safeConfig);

  pool.on("error", (err: any) => {
    if (err && err.code === "57P01") return;
    console.error("PG Pool error:", err);
  });

  const originalConnect = pool.connect.bind(pool);
  pool.connect = function (
    callback?: (
      err: Error | undefined,
      client: PoolClient | undefined,
      done: (release?: any) => void,
    ) => void,
  ): Promise<PoolClient> {
    if (callback) {
      return new Promise((resolve, reject) => {
        originalConnect((err, client, done) => {
          if (err || !client) {
            callback?.(err, undefined, done);
            reject(err ?? new Error("No client"));
            return;
          }
          client.on("error", (err: any) => {
            if (err && err.code === "57P01") return;
            console.error("PG Client error:", err);
          });
          callback?.(undefined, client, done);
          resolve(client);
        });
      });
    }
    return originalConnect().then((client: PoolClient) => {
      client.on("error", (err: any) => {
        if (err && err.code === "57P01") return;
        console.error("PG Client error:", err);
      });
      return client;
    });
  };

  return pool;
}
