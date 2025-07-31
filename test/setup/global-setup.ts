import { TestEnvironmentManager } from './environment-manager';
import { TestEnvironmentConfig } from './types';

export default async function globalSetup(): Promise<void> {
  console.log('Глобальный setup: инициализация тестового окружения...');
  
  try {
    const manager = TestEnvironmentManager.getInstance();
    
    const config: TestEnvironmentConfig = {
      services: [
        // {
        //   name: 'postgres',
        //   type: 'database',
        //   config: {
        //     type: 'postgres',
        //     version: '15-alpine',
        //     user: 'postgres',
        //     password: 'admin',
        //     database: 'lks-test',
        //     initScripts: ['test/init-db.sql'],
        //     ...(process.env.EXTRA_SQL_FILES && {
        //       initScripts: [
        //         'test/init-db.sql',
        //         ...process.env.EXTRA_SQL_FILES.split(',').map(f => f.trim()).filter(Boolean)
        //       ]
        //     })
        //   }
        // }
      ],
      globalConfig: {
        // DATABASE_HOST: '${postgres.host}',
        // DATABASE_PORT: '${postgres.port}',
        // DATABASE_USER: '${postgres.user}',
        // DATABASE_PASSWORD: '${postgres.password}',
        // DATABASE_NAME: '${postgres.database}',
      }
    };

    await manager.initializeEnvironment(config);
    
    const dbInfo = manager.getServiceConnectionInfo('postgres');
    if (dbInfo) {
      // process.env.DATABASE_HOST = dbInfo.host;
      // process.env.DATABASE_PORT = dbInfo.port.toString();
      // process.env.DATABASE_USER = dbInfo.user;
      // process.env.DATABASE_PASSWORD = dbInfo.password;
      // process.env.DATABASE_NAME = dbInfo.database;
    }
    
    console.log('Глобальный setup завершён');
  } catch (error) {
    console.error('Ошибка глобального setup:', error);
    throw error;
  }
} 