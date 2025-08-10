import { DataSourceOptions } from "typeorm";
import settings from "./settings";
import { Users } from "./auth/entities";

const { db } = settings;

const entities = [Users];

export const config: DataSourceOptions = {
  type: "postgres",
  host: process.env.DATABASE_HOST || db.host,
  port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : db.port,
  username: process.env.DATABASE_USER || db.user,
  password: process.env.DATABASE_PASSWORD || db.password,
  database: process.env.DATABASE_NAME || db.database,
  entities,
  synchronize: false,
};
