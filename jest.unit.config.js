const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: [
    "<rootDir>/test/**/*.spec.ts"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/test/integration/",
    "<rootDir>/test/e2e/"
  ],
  testTimeout: 10000,
  setupFilesAfterEnv: ["<rootDir>/test/setup/jest-setup.ts"],
  globalSetup: undefined,
  globalTeardown: undefined,
}; 