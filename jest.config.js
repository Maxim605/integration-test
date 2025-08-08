const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: [
    "**/test/**/*.spec.[jt]s?(x)",
    "**/test/**/*.e2e-spec.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  globalSetup: "<rootDir>/dist/test/setup/global-setup.js",
  globalTeardown: "<rootDir>/dist/test/setup/global-teardown.js",
  testTimeout: 35000,
  setupFilesAfterEnv: ["<rootDir>/test/setup/jest-setup.ts"],
  projects: [
    {
      displayName: "unit",
      testMatch: ["<rootDir>/test/**/*.spec.ts"],
      testPathIgnorePatterns: [
        "<rootDir>/test/integration/",
        "<rootDir>/test/e2e/",
        "<rootDir>/test/examples/",
      ],
      transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
      globalSetup: undefined,
      globalTeardown: undefined,
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/test/integration/**/*.spec.ts"],
      transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
    },
    {
      displayName: "e2e",
      testMatch: ["<rootDir>/test/e2e/**/*.spec.ts"],
      transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
    },
    {
      displayName: "examples",
      testMatch: ["<rootDir>/test/examples/**/*.spec.ts"],
      transform: { '^.+\\.(ts|tsx)$': 'ts-jest' },
    },
  ],
};