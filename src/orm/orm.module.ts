import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { config } from "../orm.config";
import { Users } from "../auth/entities";

@Module({
  imports: [TypeOrmModule.forRoot(config), TypeOrmModule.forFeature([Users])],
  exports: [TypeOrmModule, OrmModule],
})
export class OrmModule {}
