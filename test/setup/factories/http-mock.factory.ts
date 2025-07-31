import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { ServiceFactory, ServiceInstance, HttpMockConfig, HttpRouteConfig } from '../types';
import express from 'express';
import cors from 'cors';
import { createServer } from 'net';

export class HttpMockServiceInstance implements ServiceInstance {
  private container: StartedTestContainer | null = null;
  private connectionInfo: any = null;
  private app: express.Application | null = null;
  private server: any = null;

  constructor(
    public name: string,
    public type: string,
    public config: HttpMockConfig
  ) {
    console.log(`[${this.name}] HttpMockServiceInstance with config:`, {
      name: this.name,
      type: this.type,
      config: this.config
    });
  }

  async start(): Promise<void> {
  
    this.app = express();
    console.log(`[${this.name}] Express started`);
    
    this.setupMiddleware();
    console.log(`[${this.name}] Middleware configured`);
    
    this.setupRoutes();
    console.log(`[${this.name}] Routes configured`);
    
    const port = await this.findAvailablePort(this.config.port || 3000);
    console.log(`[${this.name}] Found free port: ${port}`);
    
    this.server = this.app!.listen(port, () => {
      console.log(`HTTP Mock service ${this.name} started on port ${port}`);
    });

    this.connectionInfo = {
      host: 'localhost',
      port,
      baseUrl: `http://localhost:${port}`,
    };

    await this.waitForServer();
    console.log(`[${this.name}] Server ready`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.app = null;
  }

  getConnectionInfo(): any {
    return this.connectionInfo;
  }

  private async findAvailablePort(startPort: number): Promise<number> {
    return new Promise((resolve) => {
      const server = createServer();
      server.listen(startPort, () => {
        const port = (server.address() as any).port;
        server.close(() => resolve(port));
      });
      server.on('error', () => {
        resolve(this.findAvailablePort(startPort + 1));
      });
    });
  }

  private setupMiddleware(): void {
    if (!this.app) return;

    this.app.use(cors());

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
      console.log(`[${this.name}] ${req.method} ${req.path}`);
      next();
    });

    if (this.config.middleware) {
      for (const middleware of this.config.middleware) {
        this.setupCustomMiddleware(middleware);
      }
    }
  }

  private setupCustomMiddleware(middleware: any): void {
    if (!this.app) return;

    switch (middleware.type) {
      case 'auth':
        this.app.use((req, res, next) => {
          const authHeader = req.headers.authorization;
          if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized' });
          }
          next();
        });
        break;
      case 'logging':
        this.app.use((req, res, next) => {
          console.log(`[${this.name}] Request:`, {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
          });
          next();
        });
        break;
      case 'custom':
        if (middleware.config && typeof middleware.config === 'function') {
          this.app.use(middleware.config);
        }
        break;
    }
  }

  private setupRoutes(): void {
    console.log(`[${this.name}] setupRoutes вызван`);
    console.log(`[${this.name}] this.app:`, !!this.app);
    console.log(`[${this.name}] this.config:`, this.config);
    console.log(`[${this.name}] this.config.config:`, (this.config as any).config);
    
    const actualConfig = (this.config as any).config || this.config;
    console.log(`[${this.name}] actualConfig.routes:`, actualConfig.routes);
    
    if (!this.app || !actualConfig.routes) {
      console.log(`[${this.name}] Early exit from setupRoutes`);
      return;
    }

    console.log(`[${this.name}] Setting up routes:`, actualConfig.routes.length);

    for (const route of actualConfig.routes) {
      console.log(`[${this.name}] Registering route: ${route.method} ${route.path}`);
      this.setupRoute(route);
    }

    this.app.use('*', (req, res) => {
      console.log(`[${this.name}] 404 для маршрута: ${req.method} ${req.path}`);
      res.status(404).json({ 
        error: 'Route not found',
        method: req.method,
        path: req.path 
      });
    });
  }

  private setupRoute(route: HttpRouteConfig): void {
    if (!this.app) return;

    const handler = async (req: express.Request, res: express.Response) => {
      try {
        if (route.condition && !route.condition(req)) {
          return res.status(404).json({ error: 'Route condition not met' });
        }

        if (route.delay) {
          await new Promise(resolve => setTimeout(resolve, route.delay));
        }

        if (route.response.headers) {
          for (const [key, value] of Object.entries(route.response.headers)) {
            res.setHeader(key, value);
          }
        }

        if (route.response.dynamic) {
          const dynamicResponse = route.response.dynamic(req);
          return res.status(route.response.status).json(dynamicResponse);
        }

        res.status(route.response.status).json(route.response.body);
      } catch (error) {
        console.error(`Error in route ${route.method} ${route.path}:`, error);
        res.status(500).json({ error: 'Internal server error' });
      }
    };

    switch (route.method) {
      case 'GET':
        this.app.get(route.path, handler);
        console.log(`[${this.name}] Зарегистрирован GET ${route.path}`);
        break;
      case 'POST':
        this.app.post(route.path, handler);
        console.log(`[${this.name}] Зарегистрирован POST ${route.path}`);
        break;
      case 'PUT':
        this.app.put(route.path, handler);
        console.log(`[${this.name}] Зарегистрирован PUT ${route.path}`);
        break;
      case 'DELETE':
        this.app.delete(route.path, handler);
        console.log(`[${this.name}] Зарегистрирован DELETE ${route.path}`);
        break;
      case 'PATCH':
        this.app.patch(route.path, handler);
        console.log(`[${this.name}] Зарегистрирован PATCH ${route.path}`);
        break;
    }
  }

  private async waitForServer(): Promise<void> {
    return new Promise((resolve) => {
      const checkServer = () => {
        if (this.server && this.server.listening) {
          resolve();
        } else {
          setTimeout(checkServer, 100);
        }
      };
      checkServer();
    });
  }
}

export class HttpMockFactory implements ServiceFactory {
  async createService(config: any): Promise<ServiceInstance> {
    console.log(`[HttpMockFactory] createService вызван с конфигурацией:`, config);
    return new HttpMockServiceInstance(
      config.name,
      'http-mock',
      config
    );
  }

  supports(type: string): boolean {
    return type === 'http-mock';
  }
} 