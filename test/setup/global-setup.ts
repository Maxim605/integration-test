import { TestContainerSetup } from './test-container.setup';

export default async function globalSetup(): Promise<void> {
  console.log('Глобальный setup: запуск тестовой бд...');
  try {
    let extraSqlFiles: string[] | undefined = undefined;
    if (process.env.EXTRA_SQL_FILES) {
      extraSqlFiles = process.env.EXTRA_SQL_FILES.split(',').map(f => f.trim()).filter(Boolean);
    }
    const config = await TestContainerSetup.startDatabase(extraSqlFiles);
    process.env.DATABASE_HOST = config.host;
    process.env.DATABASE_PORT = config.port.toString();
    process.env.DATABASE_USER = config.user;
    process.env.DATABASE_PASSWORD = config.password;
    process.env.DATABASE_NAME = config.database;
    console.log('Глобальный setup завершён');
  } catch (error) {
    console.error('Ошибка глобального setup:', error);
    throw error;
  }
} 