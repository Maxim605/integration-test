import {
  ServiceFactory,
  ServiceInstance,
  TestEnvironmentConfig,
  ServiceConfig,
} from "./types";
import { DatabaseFactory } from "./factories/database.factory";
import { HttpMockFactory } from "./factories/http-mock.factory";
import { LdapFactory } from "./factories/ldap.factory";

export class TestEnvironmentManager {
  private static instance: TestEnvironmentManager;
  private factories: ServiceFactory[] = [];
  private services: Map<string, ServiceInstance> = new Map();
  private isInitialized = false;

  private constructor() {
    this.registerFactories();
  }

  static getInstance(): TestEnvironmentManager {
    if (!TestEnvironmentManager.instance) {
      TestEnvironmentManager.instance = new TestEnvironmentManager();
    }
    return TestEnvironmentManager.instance;
  }

  private registerFactories(): void {
    this.factories.push(new DatabaseFactory());
    this.factories.push(new HttpMockFactory());
    this.factories.push(new LdapFactory());
  }

  async initializeEnvironment(config: TestEnvironmentConfig): Promise<void> {
    if (this.isInitialized) {
      console.log("Test environment already initialized");
      return;
    }

    try {
      for (const serviceConfig of config.services) {
        await this.startService(serviceConfig);
      }

      if (config.globalConfig) {
        this.setGlobalEnvironmentVariables(config.globalConfig);
      }

      this.isInitialized = true;
      console.log("Test environment successfully initialized");
    } catch (error) {
      console.error("Error initializing test environment:", error);
      await this.cleanup();
      throw error;
    }
  }

  private async startService(serviceConfig: ServiceConfig): Promise<void> {
    const factory = this.findFactory(serviceConfig.type);
    if (!factory) {
      throw new Error(
        `Factory for service type '${serviceConfig.type}' not found`,
      );
    }

    const service = await factory.createService(serviceConfig);
    await service.start();

    this.services.set(serviceConfig.name, service);
    console.log(`Service '${serviceConfig.name}' started`);
  }

  private findFactory(type: string): ServiceFactory | null {
    return this.factories.find((factory) => factory.supports(type)) || null;
  }

  private setGlobalEnvironmentVariables(config: Record<string, any>): void {
    for (const [key, value] of Object.entries(config)) {
      const processedValue = this.processPlaceholders(String(value));
      process.env[key] = processedValue;
    }
  }

  private processPlaceholders(value: string): string {
    return value.replace(/\$\{([^}]+)\}/g, (match, placeholder) => {
      const [serviceName, property] = placeholder.split(".");
      const service = this.services.get(serviceName);

      if (service) {
        const connectionInfo = service.getConnectionInfo();
        return connectionInfo[property] || match;
      }

      return match;
    });
  }

  getService(name: string): ServiceInstance | undefined {
    return this.services.get(name);
  }

  getServiceConnectionInfo(name: string): any {
    const service = this.services.get(name);
    return service ? service.getConnectionInfo() : null;
  }

  async stopService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (service) {
      await service.stop();
      this.services.delete(name);
      console.log(`Service '${name}' stopped`);
    }
  }

  async cleanup(): Promise<void> {
    const stopPromises = Array.from(this.services.values()).map((service) =>
      service.stop(),
    );
    await Promise.all(stopPromises);
    this.services.clear();
    this.isInitialized = false;
  }

  getServicesInfo(): Record<string, any> {
    const info: Record<string, any> = {};
    for (const [name, service] of this.services) {
      info[name] = {
        type: service.type,
        connectionInfo: service.getConnectionInfo(),
      };
    }
    return info;
  }

  async startDatabase(extraSqlFiles?: string[]): Promise<any> {
    const dbService =
      this.services.get("database") || this.services.get("postgres");
    if (!dbService) {
      throw new Error("Database not found in test environment");
    }
    return dbService.getConnectionInfo();
  }

  async stopDatabase(): Promise<void> {
    const dbService =
      this.services.get("database") || this.services.get("postgres");
    if (dbService) {
      await this.stopService(dbService.name);
    }
  }

  getDatabaseConfig(): any {
    const dbService =
      this.services.get("database") || this.services.get("postgres");
    if (!dbService) {
      throw new Error("Database not started");
    }
    return dbService.getConnectionInfo();
  }
}
