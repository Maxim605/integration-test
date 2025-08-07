import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { OrmModule } from "../orm/orm.module";
import { NotifierService } from "./notifier.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Users } from "./entities/users.entity";

@Module({
  imports: [OrmModule, TypeOrmModule.forFeature([Users])],
  controllers: [AuthController],
  providers: [AuthService, NotifierService],
  exports: [AuthService],
})
export class AuthModule {}
