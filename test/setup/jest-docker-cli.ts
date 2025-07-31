import { TestEnvironmentManager } from './environment-manager';
import { TestEnvironmentConfig } from './types';

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'start':
      console.log('Запуск тестового окружения');
      try {
        const manager = TestEnvironmentManager.getInstance();
        
        // Конфигурация по умолчанию
        const config: TestEnvironmentConfig = {
          services: [
            {
              name: 'postgres',
              type: 'database',
              config: {
                type: 'postgres',
                version: '15-alpine',
                user: 'postgres',
                password: 'admin',
                database: 'lks-test',
                initScripts: ['test/init-db.sql'],
                // Дополнительные SQL файлы из переменной окружения
                ...(process.env.EXTRA_SQL_FILES && {
                  initScripts: [
                    ...process.env.EXTRA_SQL_FILES.split(',').map(f => f.trim()).filter(Boolean)
                  ]
                })
              }
            }
          ]
        };

        await manager.initializeEnvironment(config);
        
        const servicesInfo = manager.getServicesInfo();
        console.log('Запущенные сервисы:');
        for (const [name, info] of Object.entries(servicesInfo)) {
          console.log(`  ${name} (${info.type}): ${JSON.stringify(info.connectionInfo)}`);
        }
      } catch (error) {
        console.error('Ошибка запуска тестового окружения:', error);
        process.exit(1);
      }
      break;

    case 'stop':
      console.log('Остановка тестового окружения');
      try {
        const manager = TestEnvironmentManager.getInstance();
        await manager.cleanup();
      } catch (error) {
        console.error('Ошибка остановки тестового окружения:', error);
        process.exit(1);
      }
      break;

    case 'status':
      try {
        const manager = TestEnvironmentManager.getInstance();
        const servicesInfo = manager.getServicesInfo();
        
        if (Object.keys(servicesInfo).length === 0) {
          console.log('Тестовое окружение не запущено');
        } else {
          console.log('Запущенные сервисы:');
          for (const [name, info] of Object.entries(servicesInfo)) {
            console.log(`  ${name} (${info.type}): ${JSON.stringify(info.connectionInfo)}`);
          }
        }
      } catch (error) {
        console.log('Тестовое окружение не запущено');
      }
      break;

    default:
      console.log('Доступные команды:');
      console.log('  start  - запустить тестовое окружение');
      console.log('  stop   - остановить тестовое окружение');
      console.log('  status - показать статус сервисов');
      break;
  }
}

process.on('SIGINT', async () => {
  const manager = TestEnvironmentManager.getInstance();
  await manager.cleanup();
  process.exit(0);
});

main().catch((error) => {
  console.error('CLI ошибка:', error);
  process.exit(1);
}); 