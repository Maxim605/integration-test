import "reflect-metadata";
import { IsNumber, IsString } from "class-validator";

export class Db {
  @IsString()
  public type: "database" | "http-mock" | "ldap";

  @IsString()
  public dbType: string;

  @IsString()
  public version: string;

  @IsString()
  public user: string;

  @IsString()
  public database: string;

  @IsNumber()
  public port: number;

  @IsString()
  public host: string;

  @IsString()
  public password: string;
}
