import { TestEnvironmentConfig } from "../types";

export const simpleTestConfig: TestEnvironmentConfig = {
  services: [
    // PostgreSQL
    {
      name: "test-db",
      type: "database",
      config: {
        type: "postgres",
        version: "15-alpine",
        user: "postgres",
        password: "admin",
        database: "test-db",
        initScripts: ["test/init-db.sql"],
        tables: [
          {
            name: "test_table",
            columns: [
              { name: "id", type: "SERIAL", primaryKey: true },
              { name: "name", type: "VARCHAR(100)", nullable: false },
              { name: "value", type: "INTEGER", nullable: true },
              {
                name: "created_at",
                type: "TIMESTAMP",
                defaultValue: "CURRENT_TIMESTAMP",
              },
            ],
          },
        ],
        data: {
          test_table: [
            { name: "Test Item 1", value: 100 },
            { name: "Test Item 2", value: 200 },
          ],
        },
      },
    },

    // HTTP Mock
    {
      name: "mock-api",
      type: "http-mock",
      config: {
        port: 3000,
        routes: [
          {
            method: "GET",
            path: "/api/test",
            response: {
              status: 200,
              body: { message: "Hello from mock API" },
            },
          },
          {
            method: "POST",
            path: "/api/data",
            response: {
              status: 201,
              body: { id: 1, status: "created" },
            },
          },
        ],
      },
    },
  ],
  globalConfig: {
    DATABASE_HOST: "${test-db.host}",
    DATABASE_PORT: "${test-db.port}",
    DATABASE_USER: "${test-db.user}",
    DATABASE_PASSWORD: "${test-db.password}",
    DATABASE_NAME: "${test-db.database}",
    MOCK_API_URL: "http://localhost:3000",
  },
};
