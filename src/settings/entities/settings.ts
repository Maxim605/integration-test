import "reflect-metadata";
import { Type } from "class-transformer";
import { IsDefined, ValidateNested } from "class-validator";

import { Db } from "./db";

export class Settings {
  @IsDefined()
  @Type(() => Db)
  @ValidateNested()
  public db: Db;
}
