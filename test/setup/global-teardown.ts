import { TestContainerSetup } from './test-container.setup';

export default async function globalTeardown(): Promise<void> {
  console.log('Глобальный teardown: остановка тестовой базы данных...');
  try {
    await TestContainerSetup.stopDatabase();
    console.log('Глобальный teardown завершён');
  } catch (error) {
    console.error('Ошибка глобального teardown:', error);
    throw error;
  }
  setTimeout(() => process.exit(0), 100);
} 