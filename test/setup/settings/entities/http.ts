import "reflect-metadata";
import { IsBoolean, IsInt, IsString } from "class-validator";

export class Http {
  @IsString()
  public type: "database" | "http-mock" | "ldap";

  @IsInt()
  public defaultPort: number;

  @IsBoolean()
  public strictPort: boolean;
}
