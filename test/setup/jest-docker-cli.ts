import { TestContainerSetup } from './test-container.setup';

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'start':
      console.log('Запуск контейнера');
      try {
        const extraEnv = process.env.EXTRA_SQL_FILES || '';
        const extraSqlFiles = extraEnv
          .split(',')
          .map(f => f.trim())
          .filter(f => f.length > 0);

        const config = await TestContainerSetup.startDatabase(extraSqlFiles);
        console.log('Конфигурация базы данных:');
        console.log(`   Host: ${config.host}`);
        console.log(`   Port: ${config.port}`);
        console.log(`   User: ${config.user}`);
        console.log(`   Database: ${config.database}`);
      } catch (error) {
        console.error('Ошибка запуска контейнера базы данных:', error);
        process.exit(1);
      }
      break;

    case 'stop':
      console.log('Остановка контейнера');
      try {
        await TestContainerSetup.stopDatabase();
      } catch (error) {
        console.error('Ошибка остановки контейнера базы данных:', error);
        process.exit(1);
      }
      break;

    case 'status':
      try {
        const config = TestContainerSetup.getDatabaseConfig();
        console.log('Контейнер базы данных запущен');
        console.log(`   Host: ${config.host}`);
        console.log(`   Port: ${config.port}`);
      } catch (error) {
        console.log('Контейнер базы данных не запущен');
      }
      break;
  }
}

process.on('SIGINT', async () => {
  await TestContainerSetup.stopDatabase();
  process.exit(0);
});

main().catch((error) => {
  console.error('CLI ошибка:', error);
  process.exit(1);
}); 