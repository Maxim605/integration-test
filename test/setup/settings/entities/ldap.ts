import { IsInt, IsString } from "class-validator";

export class Ldap {
  @IsString()
  public type: "database" | "http-mock" | "ldap";

  @IsInt()
  public defaultPort: number;

  @IsString()
  public baseDN: string;
}
