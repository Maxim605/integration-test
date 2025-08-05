import { Injectable, UnauthorizedException } from "@nestjs/common";
import { NotifierService } from "./notifier.service";
import { UserRepository } from "./user.repository";
import axios from "axios";

@Injectable()
export class AuthService {
  constructor(
    private readonly notifierService: NotifierService,
    private readonly userRepository: UserRepository,
  ) {}

  async authenticate(login: string, password: string): Promise<boolean> {
    try {
      const baseUrl = process.env.MOCK_BASE_URL || "http://localhost:3001";
      const response = await axios.post(`${baseUrl}/auth/login`, {
        login,
        password,
      });

      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async processLogin(login: string, password: string) {
    const authResult = await this.authenticate(login, password);
    if (!authResult) throw new UnauthorizedException();

    await this.userRepository.save({ login, password });
    await this.notifierService.sendNotification({ message: "сообщение" });

    return { status: "ok" };
  }
}
