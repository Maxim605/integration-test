import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import {
  ServiceFactory,
  ServiceInstance,
  HttpMockConfig,
  HttpRouteConfig,
} from "../types";
import express from "express";
import cors from "cors";
import { createServer } from "net";

export class HttpMockServiceInstance implements ServiceInstance {
  private container: StartedTestContainer | null = null;
  private connectionInfo: any = null;
  private app: express.Application | null = null;
  private server: any = null;

  constructor(
    public name: string,
    public type: string,
    public config: HttpMockConfig,
  ) {}

  async start(): Promise<void> {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    try {
      const port = await this.findAvailablePort(this.config.port || 3001);

      this.server = this.app!.listen(port, () => {
        console.log(`HTTP Mock service ${this.name} started on port ${port}`);
      });

      this.connectionInfo = {
        host: "localhost",
        port,
        baseUrl: `http://localhost:${port}`,
      };

      await this.waitForServer();
    } catch (error) {
      console.error(`[${this.name}] Failed to start server: ${error}`);
      throw error;
    }
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
    return new Promise((resolve, reject) => {
      const server = createServer();
      server.listen(startPort, () => {
        const port = (server.address() as any).port;
        server.close(() => resolve(port));
      });
      server.on("error", () => {
        if (this.config.strictPort) {
          server.close();
          reject(
            new Error(
              `Port ${startPort} is not available and strictPort is enabled`,
            ),
          );
          return;
        }

        const nextPort = startPort + 1;
        if (this.config.portRange) {
          if (nextPort > this.config.portRange.max) {
            server.close();
            reject(
              new Error(
                `No available ports in range ${this.config.portRange.min}-${this.config.portRange.max}`,
              ),
            );
            return;
          }
        }

        resolve(this.findAvailablePort(nextPort));
      });
    });
  }

  private setupMiddleware(): void {
    if (!this.app) return;

    this.app.use(cors());

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.app.use((req, res, next) => {
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
      case "auth":
        this.app.use((req, res, next) => {
          const authHeader = req.headers.authorization;
          if (!authHeader) {
            return res.status(401).json({ error: "Unauthorized" });
          }
          next();
        });
        break;
      case "logging":
        this.app.use((req, res, next) => {
          next();
        });
        break;
      case "custom":
        if (middleware.config && typeof middleware.config === "function") {
          this.app.use(middleware.config);
        }
        break;
    }
  }

  private setupRoutes(): void {
    const actualConfig = (this.config as any).config || this.config;

    if (!this.app || !actualConfig.routes) {
      return;
    }

    for (const route of actualConfig.routes) {
      this.setupRoute(route);
    }

    this.app.use("*", (req, res) => {
      console.log(`[${this.name}] 404 for route: ${req.method} ${req.path}`);
      res.status(404).json({
        error: "Route not found",
        method: req.method,
        path: req.path,
      });
    });
  }

  private setupRoute(route: HttpRouteConfig): void {
    if (!this.app) return;

    const handler = async (req: express.Request, res: express.Response) => {
      try {
        if (route.condition && !route.condition(req)) {
          return res.status(404).json({ error: "Route condition not met" });
        }

        if (route.delay) {
          await new Promise((resolve) => setTimeout(resolve, route.delay));
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
        res.status(500).json({ error: "Internal server error" });
      }
    };

    switch (route.method) {
      case "GET":
        this.app.get(route.path, handler);
        break;
      case "POST":
        this.app.post(route.path, handler);
        break;
      case "PUT":
        this.app.put(route.path, handler);
        break;
      case "DELETE":
        this.app.delete(route.path, handler);
        break;
      case "PATCH":
        this.app.patch(route.path, handler);
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
    return new HttpMockServiceInstance(
      config.name,
      "http-mock",
      config.config || config,
    );
  }

  supports(type: string): boolean {
    return type === "http-mock";
  }
}
