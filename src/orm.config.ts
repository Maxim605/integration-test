import { DataSourceOptions } from "typeorm";
import settings from "./settings";
import { Users } from "./auth/entities";

const { db } = settings;

const entities = [Users];

export const config: DataSourceOptions = {
  type: "postgres",
  host: db.host,
  port: db.port,
  username: db.user,
  password: db.password,
  database: db.database,
  entities,
  synchronize: false,
};
