import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "../../src/auth/auth.service";
import { NotifierService } from "../../src/auth/notifier.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Users } from "../../src/auth/entities/users.entity";

describe("Тесты сервиса аутентификации", () => {
  let service: AuthService;
  let mockNotifierService: any;
  let mockTypeOrmUsersRepository: any;

  beforeEach(async () => {
    mockNotifierService = { sendNotification: jest.fn() };
    mockTypeOrmUsersRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: NotifierService, useValue: mockNotifierService },
        { provide: getRepositoryToken(Users), useValue: mockTypeOrmUsersRepository },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it("должен возвращать true при успешной аутентификации", async () => {
    jest.spyOn(service as any, "authenticate").mockResolvedValue(true);
    const result = await service.processLogin("test", "42");
    expect(result).toEqual({ status: "ok" });
  });

  it("должен выбрасывать ошибку при неуспешной аутентификации", async () => {
    jest.spyOn(service as any, "authenticate").mockResolvedValue(false);
    await expect(service.processLogin("fail", "bad")).rejects.toThrow();
  });
});
