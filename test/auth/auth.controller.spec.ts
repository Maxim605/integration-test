import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import nock from "nock";
import { AuthController } from "../../src/auth/auth.controller";
import { AuthService } from "../../src/auth/auth.service";
import { NotifierService } from "../../src/auth/notifier.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Users } from "../../src/auth/entities/users.entity";

describe("Тесты контроллера аутентификации", () => {
  let app: INestApplication;
  let usersRepoMock: any;

  beforeAll(async () => {
    usersRepoMock = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation(async (data) => ({ id: 1, ...data })),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: NotifierService, useValue: { sendNotification: jest.fn() } },
        { provide: getRepositoryToken(Users), useValue: usersRepoMock },
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("должен возвращать статус ok при корректных данных", async () => {
    nock("http://localhost:3001")
      .post("/auth/login", { login: "test", password: "42" })
      .reply(200, { success: true });
    const response = await request(app.getHttpServer())
      .post("/login")
      .send({ login: "test", password: "42" })
      .expect(201);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("должен возвращать ошибку при некорректных данных", async () => {
    const response = await request(app.getHttpServer())
      .post("/login")
      .send({ login: "", password: "" })
      .expect(400);
    expect(response.body.message).toBeDefined();
  });
});
