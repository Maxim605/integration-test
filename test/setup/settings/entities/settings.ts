import "reflect-metadata";
import { Type } from "class-transformer";
import { IsDefined, ValidateNested } from "class-validator";

import { Db } from "./db";
import { Http } from "./http";
import { Ldap } from "./ldap";

export class Settings {
  @IsDefined()
  @Type(() => Db)
  @ValidateNested()
  public db: Db;

  @IsDefined()
  @Type(() => Http)
  @ValidateNested()
  public http: Http;

  @IsDefined()
  @Type(() => Ldap)
  @ValidateNested()
  public ldap: Ldap;
}
