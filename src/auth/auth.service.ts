import { Injectable, UnauthorizedException } from "@nestjs/common";
import { NotifierService } from "./notifier.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Users } from "./entities/users.entity";
import axios from "axios";

@Injectable()
export class AuthService {
  constructor(
    private readonly notifierService: NotifierService,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
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

    let user = await this.usersRepository.findOne({ where: { login } });
    if (user) {
      user.password = password;
    } else {
      user = this.usersRepository.create({ login, password });
    }
    await this.usersRepository.save(user);
    await this.notifierService.sendNotification({ message: "сообщение" });

    return { status: "ok" };
  }
}
