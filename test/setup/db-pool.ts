import { Pool, PoolClient, PoolConfig } from 'pg';

export function createTestPool(config: PoolConfig): Pool {
  const pool = new Pool(config);

  pool.on('error', (err: any) => {
    if (err && err.code === '57P01') return;
    console.error('PG Pool error:', err);
  });

  const originalConnect = pool.connect.bind(pool);
  pool.connect = function(callback?: (err: Error | undefined, client: PoolClient | undefined, done: (release?: any) => void) => void): Promise<PoolClient> {
    if (callback) {
      return new Promise((resolve, reject) => {
        originalConnect((err, client, done) => {
          if (err || !client) {
            callback?.(err, undefined, done);
            reject(err ?? new Error('No client'));
            return;
          }
          client.on('error', (err: any) => {
            if (err && err.code === '57P01') return;
            console.error('PG Client error:', err);
          });
          callback?.(undefined, client, done);
          resolve(client);
        });
      });
    }
    return originalConnect().then((client: PoolClient) => {
      client.on('error', (err: any) => {
        if (err && err.code === '57P01') return;
        console.error('PG Client error:', err);
      });
      return client;
    });
  };

  return pool;
} 