import { ApiProperty } from "@nestjs/swagger";
import { DateTime } from "luxon";
import { AsDateTime, CreatedAt } from "../../common/decorators";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("users")
export class Users {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: "Первичный ключ",
  })
  public id: number;

  @ApiProperty({
    description: "Логин",
  })
  @Column({
    type: "text",
    nullable: true,
  })
  public login?: string;

  @ApiProperty({
    description: "Пароль",
  })
  @Column({
    type: "text",
    nullable: true,
  })
  public password?: string;

  @CreatedAt()
  @ApiProperty({
    description: "Дата-время создания",
    type: "string",
    format: "date-time",
  })
  @AsDateTime()
  public created_at: DateTime;
}
