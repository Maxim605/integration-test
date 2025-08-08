import settings from "../settings";
import { TestEnvironmentConfig } from "../types";

export const complexTestConfig: TestEnvironmentConfig = {
  services: [
    // PostgreSQL
    {
      name: "users-db",
      type: "database",
      config: {
        type: "postgres",
        version: "15-alpine",
        user: "postgres",
        password: "admin",
        database: "users-test",
        tables: [
          {
            name: "users",
            columns: [
              {
                name: "id",
                type: "SERIAL",
                primaryKey: true,
              },
              { name: "username", type: "VARCHAR(50)", nullable: false },
              { name: "email", type: "VARCHAR(100)", nullable: false },
              { name: "password", type: "VARCHAR(255)", nullable: false },
              {
                name: "created_at",
                type: "TIMESTAMP",
                defaultValue: "CURRENT_TIMESTAMP",
              },
              {
                name: "updated_at",
                type: "TIMESTAMP",
                defaultValue: "CURRENT_TIMESTAMP",
              },
            ],
            indexes: [
              {
                name: "idx_users_username",
                columns: ["username"],
                unique: true,
              },
              { name: "idx_users_email", columns: ["email"], unique: true },
            ],
          },
          {
            name: "user_roles",
            columns: [
              { name: "id", type: "SERIAL", primaryKey: true },
              { name: "user_id", type: "INTEGER", nullable: false },
              { name: "role", type: "VARCHAR(50)", nullable: false },
              {
                name: "created_at",
                type: "TIMESTAMP",
                defaultValue: "CURRENT_TIMESTAMP",
              },
            ],
            constraints: [
              {
                name: "fk_user_roles_user_id",
                type: "foreign_key",
                columns: ["user_id"],
                references: { table: "users", columns: ["id"] },
              },
            ],
          },
        ],
        data: {
          users: [
            {
              username: "admin",
              email: "admin@example.com",
              password: "admin123",
              created_at: "2024-01-01 00:00:00",
              updated_at: "2024-01-01 00:00:00",
            },
            {
              username: "user1",
              email: "user1@example.com",
              password: "user123",
              created_at: "2024-01-01 00:00:00",
              updated_at: "2024-01-01 00:00:00",
            },
          ],
          user_roles: [
            { user_id: 1, role: "admin", created_at: "2024-01-01 00:00:00" },
            { user_id: 2, role: "user", created_at: "2024-01-01 00:00:00" },
          ],
        },
      },
    },

    // HTTP Mock
    {
      name: "external-api",
      type: "http-mock",
      config: {
        port: 3001,
        strictPort: true,
        routes: [
          {
            method: "GET",
            path: "/api/users/:id",
            response: {
              status: 200,
              headers: { "Content-Type": "application/json" },
              dynamic: (req: any) => ({
                id: req.params.id,
                name: "John Doe",
                email: "john@example.com",
                role: "user",
              }),
            },
          },
          {
            method: "POST",
            path: "/api/auth/login",
            response: {
              status: 200,
              headers: { "Content-Type": "application/json" },
              body: {
                token: "mock-jwt-token",
                expires_in: 3600,
                user: {
                  id: 1,
                  username: "testuser",
                  email: "test@example.com",
                },
              },
            },
          },
          {
            method: "GET",
            path: "/api/health",
            response: {
              status: 200,
              body: { status: "ok", timestamp: new Date().toISOString() },
            },
          },
        ],
        middleware: [{ type: "cors" }, { type: "logging" }],
      },
    },

    // LDAP
    {
      name: "ldap-server",
      type: settings.ldap.type,
      config: {
        port: settings.ldap.defaultPort,
        baseDN: "dc=example,dc=com",
        users: [
          {
            dn: "uid=admin,ou=users,dc=example,dc=com",
            password: "admin123",
            attributes: {
              uid: "admin",
              cn: "Administrator",
              sn: "Admin",
              mail: "admin@example.com",
              userPassword: "admin123",
            },
          },
          {
            dn: "uid=user1,ou=users,dc=example,dc=com",
            password: "user123",
            attributes: {
              uid: "user1",
              cn: "Test User",
              sn: "User",
              mail: "user1@example.com",
              userPassword: "user123",
            },
          },
        ],
        groups: [
          {
            dn: "cn=admins,ou=groups,dc=example,dc=com",
            members: ["uid=admin,ou=users,dc=example,dc=com"],
            attributes: {
              cn: "admins",
              description: "Administrators group",
            },
          },
          {
            dn: "cn=users,ou=groups,dc=example,dc=com",
            members: ["uid=user1,ou=users,dc=example,dc=com"],
            attributes: {
              cn: "users",
              description: "Regular users group",
            },
          },
        ],
      },
    },
  ],
  globalConfig: {
    EXTERNAL_API_URL: "http://localhost:3001",
    LDAP_URL: "ldap://localhost:389",
    LDAP_BASE_DN: "dc=example,dc=com",
    LDAP_BIND_DN: "cn=admin,dc=example,dc=com",
    LDAP_BIND_PASSWORD: "admin123",
    USERS_DB_HOST: "${users-db.host}",
    USERS_DB_PORT: "${users-db.port}",
    USERS_DB_USER: "${users-db.user}",
    USERS_DB_PASSWORD: "${users-db.password}",
    USERS_DB_NAME: "${users-db.database}",
  },
};
