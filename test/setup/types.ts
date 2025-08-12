export interface ServiceConfig {
  name: string;
  type: "database" | "http-mock" | "ldap";
  config: any;
}

export interface TestEnvironmentConfig {
  services: ServiceConfig[];
  globalConfig?: Record<string, any>;
}

export interface DatabaseConfig {
  type: string;
  version?: string;
  user?: string;
  password?: string;
  database?: string;
  initScripts?: string[];
  tables?: TableConfig[];
  data?: Record<string, any[]>;
}

export interface TableConfig {
  name: string;
  columns: ColumnConfig[];
  indexes?: IndexConfig[];
  constraints?: ConstraintConfig[];
}

export interface ColumnConfig {
  name: string;
  type: string;
  unique?: boolean;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  defaultValue?: any;
}

export interface IndexConfig {
  name: string;
  columns: string[];
  unique?: boolean;
}

export interface ConstraintConfig {
  name: string;
  type: "foreign_key" | "unique" | "check";
  columns: string[];
  references?: {
    table: string;
    columns: string[];
  };
  condition?: string;
}

export interface HttpMockConfig {
  port?: number;
  strictPort?: boolean; // Если true, то порт не будет переназначаться на свободный
  portRange?: { min: number; max: number }; // Диапазон портов для поиска
  routes: HttpRouteConfig[];
  middleware?: HttpMiddlewareConfig[];
}

export interface HttpRouteConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  response: HttpResponseConfig;
  delay?: number;
  condition?: (req: any) => boolean;
}

export interface HttpResponseConfig {
  status: number;
  body?: any;
  headers?: Record<string, string>;
  dynamic?: (req: any) => any;
}

export interface HttpMiddlewareConfig {
  type: "cors" | "auth" | "logging" | "custom";
  config?: any;
}

export interface LdapConfig {
  port?: number;
  baseDN: string;
  users?: LdapUserConfig[];
  groups?: LdapGroupConfig[];
  schema?: LdapSchemaConfig;
}

export interface LdapUserConfig {
  dn: string;
  attributes: Record<string, any>;
  password?: string;
}

export interface LdapGroupConfig {
  dn: string;
  members: string[];
  attributes?: Record<string, any>;
}

export interface LdapSchemaConfig {
  objectClasses?: Record<string, any>;
  attributes?: Record<string, any>;
}

export interface ServiceInstance {
  name: string;
  type: string;
  config: any;
  start(): Promise<void>;
  stop(): Promise<void>;
  getConnectionInfo(): any;
}

export interface ServiceFactory {
  createService(config: any): Promise<ServiceInstance>;
  supports(type: string): boolean;
}
