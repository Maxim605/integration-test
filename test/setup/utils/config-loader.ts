import { TestEnvironmentConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigLoader {
  static loadFromFile(filePath: string): TestEnvironmentConfig {
    const fullPath = path.resolve(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Файл конфигурации не найден: ${fullPath}`);
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const config = JSON.parse(content);
      
      this.validateConfig(config);
      
      return config;
    } catch (error) {
      throw new Error(`Ошибка загрузки конфигурации из файла ${filePath}: ${error}`);
    }
  }

  static loadFromEnvironment(): TestEnvironmentConfig | null {
    const configEnv = process.env.TEST_ENVIRONMENT_CONFIG;
    if (!configEnv) {
      return null;
    }

    try {
      const config = JSON.parse(configEnv);
      this.validateConfig(config);
      return config;
    } catch (error) {
      throw new Error(`Env error: ${error}`);
    }
  }

  static createDefaultConfig(): TestEnvironmentConfig {
    return {
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
            initScripts: ['test/init-db.sql']
          }
        }
      ],
      globalConfig: {
        DATABASE_HOST: '${postgres.host}',
        DATABASE_PORT: '${postgres.port}',
        DATABASE_USER: '${postgres.user}',
        DATABASE_PASSWORD: '${postgres.password}',
        DATABASE_NAME: '${postgres.database}'
      }
    };
  }

  static mergeConfigs(...configs: TestEnvironmentConfig[]): TestEnvironmentConfig {
    if (configs.length === 0) {
      return this.createDefaultConfig();
    }

    if (configs.length === 1) {
      return configs[0];
    }

    const merged: TestEnvironmentConfig = {
      services: [],
      globalConfig: {}
    };

    for (const config of configs) {
      if (config.services) {
        merged.services.push(...config.services);
      }
      if (config.globalConfig) {
        Object.assign(merged.globalConfig!, config.globalConfig);
      }
    }

    return merged;
  }

  private static validateConfig(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Config is not object');
    }

    if (!Array.isArray(config.services)) {
      throw new Error('Service is not array');
    }

    for (const service of config.services) {
      if (!service.name || !service.type || !service.config) {
        throw new Error('name, type, config fields is not exist');
      }

      if (!['database', 'http-mock', 'ldap'].includes(service.type)) {
        throw new Error(`Service type error: ${service.type}`);
      }
    }
  }

  static saveToFile(config: TestEnvironmentConfig, filePath: string): void {
    const fullPath = path.resolve(process.cwd(), filePath);
    const content = JSON.stringify(config, null, 2);
    
    try {
      fs.writeFileSync(fullPath, content, 'utf8');
    } catch (error) {
      throw new Error(`Config save error: ${filePath}: ${error}`);
    }
  }
} 