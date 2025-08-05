import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { NotifierService } from "./auth/notifier.service";
import { UserRepository } from "./auth/user.repository";

@Module({
  imports: [],
  controllers: [AuthController],
  providers: [AuthService, NotifierService, UserRepository],
})
export class AppModule {}
