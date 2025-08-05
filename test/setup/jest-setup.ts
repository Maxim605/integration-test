import "reflect-metadata";

jest.setTimeout(30000);

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.MOCK_BASE_URL = "http://localhost:3001";
});

afterEach(() => {
  jest.clearAllMocks();
});

const originalConsoleError = console.error;
console.error = function (...args) {
  if (
    args.length > 0 &&
    typeof args[0] === "string" &&
    args[0].includes("terminating connection due to administrator command")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
