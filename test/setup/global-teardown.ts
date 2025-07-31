import { TestEnvironmentManager } from './environment-manager';

export default async function globalTeardown(): Promise<void> {
  console.log('Глобальный teardown: очистка тестового окружения...');
  try {
    const manager = TestEnvironmentManager.getInstance();
    await manager.cleanup();
    console.log('Глобальный teardown завершён');
  } catch (error) {
    console.error('Ошибка глобального teardown:', error);
    throw error;
  }
} 