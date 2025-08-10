# Settings & Authentication Test System

This project provides a modular system for centralized configuration management and robust integration testing of authentication and related services. Built with [NestJS](https://nestjs.com/), it supports flexible service orchestration, database setup, and mock HTTP/LDAP services for comprehensive test automation.

## Features

- **Centralized settings management** for test environments
- **Integration and unit testing** for authentication flows
- **Mock services** (HTTP, LDAP) for isolated testing
- **Database orchestration** using Docker and Postgres
- **Validation and transformation utilities**
- **Extensible architecture** for adding new services and test scenarios

## Project Structure

```
├── src/
│   ├── app.module.ts           # Main NestJS application module
│   ├── main.ts                 # Application entry point
│   ├── auth/                   # Authentication module (controller, service, entities, DTOs)
│   ├── common/                 # Shared decorators, transformers, and utilities
│   ├── orm/                    # ORM module and configuration
│   └── settings/               # Settings management module
│
├── test/
│   ├── integration/            # Integration tests (e.g., auth.integration.spec.ts)
│   ├── e2e/                    # End-to-end tests
│   ├── auth/                   # Unit tests for auth module
│   ├── examples/               # Example test scenarios
│   ├── setup/                  # Test environment setup, factories, and utilities
│   └── sql/                    # SQL scripts for test DB
│
├── Dockerfile                  # Docker setup for test environments
├── docker-compose.yml          # Compose file for orchestrating services
├── package.json                # Project dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project documentation
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) (for integration tests)

### Installation
```bash
npm install
```

### Running the Application
```bash
npm start
```

### Running Tests
- **All tests (with Docker):**
  ```bash
  npm test
  ```
- **Unit tests only:**
  ```bash
  npx jest --config jest.unit.config.js
  ```

### Formatting Code
```bash
npm run format
```

## Settings Management

Settings are loaded from a configuration file (JSON/YAML) or generated with defaults. The system supports validation and dynamic injection into test environments.

#### Example settings file (`settings.json`):
```json
{
  "db": {
    "type": "postgres",
    "dbType": "postgres",
    "version": "15",
    "user": "postgres",
    "password": "password",
    "database": "testdb"
  },
  "auth": {
    "type": "http-mock",
    "defaultPort": 3001,
    "strictPort": false
  },
  "ldap": {
    "type": "ldap",
    "defaultPort": 389,
    "baseDN": "dc=test,dc=com"
  }
}
```

#### Usage in tests:
```typescript
import { loadSettings, getSettings } from '../setup/settings';

await loadSettings();
const settings = getSettings();
```

## Integration Testing

Integration tests are located in `test/integration/` and use Docker to spin up real or mock services. Example: `auth.integration.spec.ts` tests authentication flows, user creation, validation, and concurrent requests.

- Test setup and teardown are managed via `test/setup/` utilities.
- Factories for database, HTTP mocks, and LDAP are provided in `test/setup/factories/`.
- Example test scenarios are in `test/examples/`.

## Main Modules
- **src/auth/**: Authentication logic (controller, service, repository, DTOs, entities)
- **src/settings/**: Settings loader, entities, and validation
- **src/common/**: Decorators, transformers, and shared utilities
- **test/setup/**: Test environment management, factories, and helpers

## Scripts
- `npm start` — Run the application
- `npm test` — Run all tests (integration + unit)
- `npm run format` — Format code with Prettier

## Technologies Used
- [NestJS](https://nestjs.com/)
- [TypeORM](https://typeorm.io/)
- [PostgreSQL](https://www.postgresql.org/)
- [Jest](https://jestjs.io/)
- [Supertest](https://github.com/visionmedia/supertest)
- [Docker](https://www.docker.com/)
- [Testcontainers](https://www.testcontainers.org/)

## Example
See `test/examples/usage-example.spec.ts` and `test/integration/auth.integration.spec.ts` for real-world usage and integration scenarios.

## Contribution
Pull requests and issues are welcome! Please ensure code is formatted and tests are passing before submitting.

## License
MIT 