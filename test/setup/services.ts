import settings from "./settings";
import { DatabaseServiceInstance } from "./factories/database.factory";
import { HttpMockServiceInstance } from "./factories/http-mock.factory";
import { LdapServiceInstance } from "./factories/ldap.factory";
import { ServiceConfig, TestEnvironmentConfig } from "./types";

type StartedService = {
  name: string;
  type: string;
  instance: any;
  connectionInfo: any;
};

export class TestDB {
  constructor(
    public connection: {
      host: string;
      port: number | string;
      user: string;
      password: string;
      database: string;
    },
  ) {}
}

export class HttpMockServer {
  constructor(public info: { host: string; port: number; baseUrl: string }) {}
}

export class LdapServer {
  constructor(
    public info: { host: string; port: number; baseDN: string; url: string },
  ) {}
}

function resolveSettingsPath(path: string): any {
  const parts = path.split(".");
  let cur: any = settings as any;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function applyGlobalEnv(
  globalConfig: Record<string, any> | undefined,
  services: Map<string, StartedService>,
): void {
  if (!globalConfig) return;
  const placeholderRegex = /\$\{([^}]+)\}/g;
  for (const [key, value] of Object.entries(globalConfig)) {
    if (typeof value !== "string") {
      process.env[key] = String(value);
      continue;
    }
    const replaced = value.replace(placeholderRegex, (match, expr) => {
      if (expr.startsWith("settings.")) {
        const settingsPath = expr.replace(/^settings\./, "");
        const v = resolveSettingsPath(settingsPath);
        return v !== undefined ? String(v) : match;
      }
      const [serviceName, property] = String(expr).split(".");
      const service = services.get(serviceName);
      if (
        service &&
        service.connectionInfo &&
        property in service.connectionInfo
      ) {
        return String(service.connectionInfo[property]);
      }
      return match;
    });
    process.env[key] = replaced;
  }
}

export async function startServices(
  config: TestEnvironmentConfig,
): Promise<{
  services: Map<string, StartedService>;
  dbs: Map<string, TestDB>;
  https: Map<string, HttpMockServer>;
  ldaps: Map<string, LdapServer>;
}> {
  const services = new Map<string, StartedService>();
  const dbs = new Map<string, TestDB>();
  const https = new Map<string, HttpMockServer>();
  const ldaps = new Map<string, LdapServer>();

  for (const svc of config.services) {
    await startService(svc, services, dbs, https, ldaps);
  }

  applyGlobalEnv(config.globalConfig, services);

  return { services, dbs, https, ldaps };
}

async function startService(
  svc: ServiceConfig,
  services: Map<string, StartedService>,
  dbs: Map<string, TestDB>,
  https: Map<string, HttpMockServer>,
  ldaps: Map<string, LdapServer>,
): Promise<void> {
  switch (svc.type) {
    case "database": {
      const instance = new DatabaseServiceInstance(
        svc.name,
        "database",
        svc.config,
      );
      await instance.start();
      const connectionInfo = instance.getConnectionInfo();
      services.set(svc.name, {
        name: svc.name,
        type: svc.type,
        instance,
        connectionInfo,
      });
      const dbConn = {
        host: String(connectionInfo.host),
        port: Number(connectionInfo.port),
        user: String(connectionInfo.user),
        password: String(connectionInfo.password),
        database: String(connectionInfo.database),
      };
      dbs.set(svc.name, new TestDB(dbConn));
      break;
    }
    case "http-mock": {
      const instance = new HttpMockServiceInstance(
        svc.name,
        "http-mock",
        svc.config,
      );
      await instance.start();
      const connectionInfo = instance.getConnectionInfo();
      services.set(svc.name, {
        name: svc.name,
        type: svc.type,
        instance,
        connectionInfo,
      });
      https.set(svc.name, new HttpMockServer(connectionInfo));
      break;
    }
    case "ldap": {
      const instance = new LdapServiceInstance(svc.name, "ldap", svc.config);
      await instance.start();
      const connectionInfo = instance.getConnectionInfo();
      services.set(svc.name, {
        name: svc.name,
        type: svc.type,
        instance,
        connectionInfo,
      });
      ldaps.set(svc.name, new LdapServer(connectionInfo));
      break;
    }
    default:
      throw new Error(`Unsupported service type: ${svc.type}`);
  }
}

export async function stopServices(
  services: Map<string, StartedService>,
): Promise<void> {
  const stops: Promise<void>[] = [];
  for (const svc of services.values()) {
    stops.push(svc.instance.stop());
  }
  await Promise.allSettled(stops);
  services.clear();
}
