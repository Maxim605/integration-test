import "reflect-metadata";
import { IsNumber, IsString } from "class-validator";

export class Db {
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
